/**
 * Capture — auto-run lasso OCR and create Todoist parent + subtasks.
 */

import React, {useEffect, useState} from 'react';
import {View, Text, Pressable, StyleSheet, ScrollView} from 'react-native';
import {PluginCommAPI} from 'sn-plugin-lib';
import {closePlugin} from '../utils/closePlugin';
import {loadConfig, getConfigSource} from '../utils/config';
import {log, logError, getEntries, exportLog, startLogSession} from '../utils/debug';
import {recognizeLassoElements} from '../utils/ocr';
import {consumeCachedLasso, lassoFingerprint} from '../utils/lassoCache';
import {
  setConfigLoader,
  getTargetProject,
  ensureParentTask,
  createSubtasks,
  testConnection,
  buildParentTitle,
} from '../api/todoist';

type Phase = 'working' | 'review' | 'error';

type CaptureReview = {
  ocrText: string;
  projectName: string;
  projectId: string;
  parentTitle: string;
  parentId: string;
  parentReused: boolean;
  subtasks: Array<{id: string; content: string}>;
  skippedSubtasks: string[];
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

function formatDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTaskLines(text: string): string[] {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

function fileBaseName(filePath: string): string {
  const name = filePath.split('/').pop() || 'note';
  return name.replace(/\.note$/i, '');
}

async function readLassoSelection(): Promise<any> {
  const cached = consumeCachedLasso();
  if (cached?.success && cached.result?.length) {
    log(
      'Capture',
      `Using cached lasso: ${cached.result.length} elements [${lassoFingerprint(cached.result)}]`,
    );
    return cached;
  }

  log('Capture', 'No cached lasso; calling getLassoElements...');
  const lasso = await withTimeout(
    PluginCommAPI.getLassoElements(),
    10000,
    'getLassoElements',
  );
  log(
    'Capture',
    `Fresh lasso: ${lasso?.result?.length ?? 0} elements [${lassoFingerprint(lasso?.result ?? [])}]`,
  );
  return lasso;
}

function ReviewPanel({review, onClose}: {review: CaptureReview; onClose: () => void}) {
  return (
    <ScrollView style={s.reviewScroll} contentContainerStyle={s.reviewContent}>
      <Text style={s.sectionTitle}>Recognized text</Text>
      <View style={s.block}>
        <Text style={s.ocrText}>{review.ocrText}</Text>
      </View>

      <Text style={s.sectionTitle}>Todoist project</Text>
      <Text style={s.bodyText}>{review.projectName}</Text>

      <Text style={s.sectionTitle}>Parent task</Text>
      <View style={s.block}>
        <Text style={s.parentText}>{review.parentTitle}</Text>
        {review.parentReused ? (
          <Text style={s.hintText}>
            Reused today&apos;s parent for this note — new subtasks appended below.
          </Text>
        ) : null}
      </View>

      <Text style={s.sectionTitle}>
        Subtasks ({review.subtasks.length})
      </Text>
      {review.subtasks.map((task, i) => (
        <View key={task.id} style={s.subtaskRow}>
          <Text style={s.subtaskBullet}>{i + 1}.</Text>
          <Text style={s.subtaskText}>{task.content}</Text>
        </View>
      ))}

      {review.skippedSubtasks.length > 0 ? (
        <Text style={s.hintText}>
          Skipped {review.skippedSubtasks.length} duplicate line
          {review.skippedSubtasks.length > 1 ? 's' : ''} already under this parent.
        </Text>
      ) : null}

      <Pressable style={[s.btn, s.btnPrimary]} onPress={onClose}>
        <Text style={[s.btnText, s.btnPrimaryText]}>Close</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function Capture() {
  const [phase, setPhase] = useState<Phase>('working');
  const [status, setStatus] = useState('Starting...');
  const [review, setReview] = useState<CaptureReview | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    setConfigLoader(loadConfig);
    runCapture();
  }, []);

  const runCapture = async () => {
    startLogSession('capture');
    setPhase('working');
    setReview(null);
    try {
      setStatus('Loading config...');
      const config = await loadConfig();
      if (!config.apiToken) {
        throw new Error(
          'No Todoist API token. Connect via USB and edit MyStyle/NoteTaskBot/notetaskbot-config.json ' +
          '(set apiToken). If SuperTask is already configured, rebuild with the latest plugin to reuse that token.',
        );
      }
      log('Capture', `Config source: ${getConfigSource()}`);

      setStatus('Reading lasso selection...');
      const lasso = await readLassoSelection();

      if (!lasso?.success || !lasso.result?.length) {
        throw new Error('No elements selected. Lasso handwriting first.');
      }

      setStatus('Checking Todoist...');
      const conn = await testConnection();
      if (!conn.hasTargetProject) {
        throw new Error(
          `Todoist project not found (id=${conn.targetProjectId}). ` +
          'Update targetProjectId in notetaskbot-config.json.',
        );
      }
      log('Capture', `Todoist OK: project "${conn.targetProjectName}"`);

      setStatus('Recognizing handwriting...');
      const ocr = await recognizeLassoElements(lasso.result, msg => log('Capture', msg));
      if (!ocr.success || !ocr.text) {
        throw new Error('Could not recognize handwriting. Try clearer text.');
      }

      const lines = parseTaskLines(ocr.text);
      if (lines.length === 0) {
        throw new Error('No task lines found after recognition.');
      }

      let filePath = ocr.pageContext?.filePath || '';
      if (!filePath) {
        try {
          const fp = await withTimeout(PluginCommAPI.getCurrentFilePath(), 3000, 'getCurrentFilePath');
          filePath = fp?.result || '';
          if (filePath) log('Capture', `Recovered filePath: ${filePath}`);
        } catch (e: any) {
          log('Capture', `getCurrentFilePath fallback failed: ${e.message}`);
        }
      }

      const fileName = fileBaseName(filePath);
      const pageNum = ocr.pageContext?.pageNum ?? 0;
      const dateStr = formatDate();

      setStatus('Connecting to Todoist...');
      const project = await getTargetProject();

      setStatus('Finding or creating parent task...');
      const {task: parent, reused: parentReused} = await ensureParentTask(
        project.id,
        fileName,
        pageNum,
        dateStr,
      );
      const parentId = parent?.id;
      if (!parentId) throw new Error('Failed to create parent task');

      setStatus(`Adding ${lines.length} subtask(s)...`);
      const {created, skipped} = await createSubtasks(project.id, parentId, lines);

      if (created.length === 0) {
        if (skipped.length > 0) {
          throw new Error(
            'This text is already under today\'s parent task. Lasso a new line and try again.',
          );
        }
        throw new Error('No new subtasks were created.');
      }

      const parentTitle = parent.content || buildParentTitle(fileName, pageNum, dateStr);
      const subtasks = created.map(t => ({id: t.id, content: t.content}));

      setReview({
        ocrText: ocr.text,
        projectName: project.name || conn.targetProjectName || project.id,
        projectId: project.id,
        parentTitle,
        parentId,
        parentReused,
        subtasks,
        skippedSubtasks: skipped,
      });
      setPhase('review');
      setStatus(
        skipped.length > 0
          ? `Added ${subtasks.length} subtask(s); skipped ${skipped.length} duplicate(s)`
          : 'Added to Todoist',
      );
      log(
        'Capture',
        `Review: ${subtasks.length} new, ${skipped.length} skipped under "${parentTitle}"`,
      );

      try {
        await PluginCommAPI.setLassoBoxState(2);
        log('Capture', 'Cleared lasso selection for next capture');
      } catch (e: any) {
        log('Capture', `setLassoBoxState failed: ${e.message}`);
      }
    } catch (err: any) {
      logError('Capture', err);
      setPhase('error');
      setStatus(err.message || 'Capture failed');
    }
  };

  const handleClose = () => closePlugin();

  const handleShowLog = async () => {
    setLogLines(getEntries());
    setShowLog(true);
  };

  const handleUploadLog = async () => {
    const result = await exportLog();
    setLogLines([...getEntries(), result]);
  };

  if (showLog) {
    return (
      <View style={s.overlay}>
        <View style={s.panel}>
          <Text style={s.title}>Debug Log</Text>
          <ScrollView style={s.logScroll}>
            {logLines.map((line, i) => (
              <Text key={i} style={s.logLine}>{line}</Text>
            ))}
          </ScrollView>
          <View style={s.row}>
            <Pressable style={s.btn} onPress={handleUploadLog}>
              <Text style={s.btnText}>Upload</Text>
            </Pressable>
            <Pressable style={s.btn} onPress={() => setShowLog(false)}>
              <Text style={s.btnText}>Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.overlay}>
      <Pressable style={s.backdrop} onPress={phase === 'review' ? undefined : handleClose} />
      <View style={[s.panel, phase === 'review' && s.panelTall]}>
        <Text style={s.title}>NoteTaskBot</Text>

        {phase === 'working' && (
          <Text style={s.status}>{status}</Text>
        )}

        {phase === 'review' && review && (
          <>
            <Text style={s.status}>{status}</Text>
            <ReviewPanel review={review} onClose={handleClose} />
          </>
        )}

        {phase === 'error' && (
          <>
            <Text style={s.status}>{status}</Text>
            <View style={s.row}>
              <Pressable style={s.btn} onPress={runCapture}>
                <Text style={s.btnText}>Retry</Text>
              </Pressable>
              <Pressable style={s.btn} onPress={handleClose}>
                <Text style={s.btnText}>Close</Text>
              </Pressable>
            </View>
          </>
        )}

        {phase !== 'review' && (
          <Pressable style={s.linkBtn} onPress={handleShowLog}>
            <Text style={s.linkText}>Log</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    width: 520,
    maxWidth: '92%',
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 24,
  },
  panelTall: {
    flexShrink: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  status: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
    lineHeight: 22,
  },
  reviewScroll: {
    flexGrow: 0,
    maxHeight: 520,
  },
  reviewContent: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
    marginBottom: 6,
  },
  block: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 10,
    marginBottom: 4,
  },
  ocrText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  bodyText: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
    lineHeight: 20,
  },
  parentText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 21,
  },
  hintText: {
    fontSize: 12,
    color: '#000000',
    marginTop: 6,
    lineHeight: 16,
  },
  subtaskRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 4,
  },
  subtaskBullet: {
    width: 22,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#000000',
    marginTop: 16,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  btnPrimaryText: {
    color: '#ffffff',
  },
  linkBtn: {
    marginTop: 16,
    alignSelf: 'center',
    padding: 8,
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    color: '#000000',
  },
  logScroll: {
    maxHeight: 320,
    marginVertical: 12,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#000000',
    marginBottom: 3,
  },
});
