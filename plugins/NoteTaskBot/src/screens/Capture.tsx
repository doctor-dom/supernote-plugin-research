/**
 * Capture — auto-run lasso OCR and create Todoist parent + subtasks.
 */

import React, {useEffect, useState} from 'react';
import {View, Text, Pressable, StyleSheet, ScrollView} from 'react-native';
import {PluginCommAPI} from 'sn-plugin-lib';
import {closePlugin} from '../utils/closePlugin';
import {loadConfig} from '../utils/config';
import {log, logError, getEntries, exportLog} from '../utils/debug';
import {recognizeLassoElements} from '../utils/ocr';
import {markCaptureSuccess} from '../utils/checkboxMark';
import {
  setConfigLoader,
  getTargetProject,
  ensureParentTask,
  createSubtasks,
} from '../api/todoist';

type Phase = 'working' | 'success' | 'error';

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

export default function Capture() {
  const [phase, setPhase] = useState<Phase>('working');
  const [status, setStatus] = useState('Starting...');
  const [detail, setDetail] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    setConfigLoader(loadConfig);
    runCapture();
  }, []);

  const runCapture = async () => {
    try {
      setStatus('Reading lasso selection...');
      const lasso = await withTimeout(
        PluginCommAPI.getLassoElements(),
        10000,
        'getLassoElements',
      );

      if (!lasso?.success || !lasso.result?.length) {
        throw new Error('No elements selected. Lasso handwriting first.');
      }

      setStatus('Recognizing handwriting...');
      const ocr = await recognizeLassoElements(lasso.result, msg => log('Capture', msg));
      if (!ocr.success || !ocr.text) {
        throw new Error('Could not recognize handwriting. Try clearer text.');
      }

      const lines = parseTaskLines(ocr.text);
      if (lines.length === 0) {
        throw new Error('No task lines found after recognition.');
      }

      let bounds = null;
      try {
        const lr = await withTimeout(PluginCommAPI.getLassoRect(), 5000, 'getLassoRect');
        if (lr?.success && lr.result) bounds = lr.result;
      } catch (e: any) {
        log('Capture', `getLassoRect failed: ${e.message}`);
      }

      const filePath = ocr.pageContext?.filePath || '';
      const fileName = fileBaseName(filePath);
      const dateStr = formatDate();

      setStatus('Connecting to Todoist...');
      const project = await getTargetProject();

      setStatus('Creating parent task...');
      const parent = await ensureParentTask(project.id, fileName, dateStr);
      const parentId = parent?.id;
      if (!parentId) throw new Error('Failed to create parent task');

      setStatus(`Adding ${lines.length} subtask(s)...`);
      const created = await createSubtasks(project.id, parentId, lines);

      setStatus('Marking note...');
      await markCaptureSuccess(bounds);

      setDetail(`${created.length} subtask(s) under "${parent.content}"`);
      setPhase('success');
      setStatus('Done');
      log('Capture', `Success: ${created.length} subtasks`);
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
      <Pressable style={s.backdrop} onPress={handleClose} />
      <View style={s.panel}>
        <Text style={s.title}>NoteTaskBot</Text>
        <Text style={s.status}>{status}</Text>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}

        {phase === 'success' && (
          <Pressable style={[s.btn, s.btnPrimary]} onPress={handleClose}>
            <Text style={[s.btnText, s.btnPrimaryText]}>Close</Text>
          </Pressable>
        )}

        {phase === 'error' && (
          <View style={s.row}>
            <Pressable style={s.btn} onPress={runCapture}>
              <Text style={s.btnText}>Retry</Text>
            </Pressable>
            <Pressable style={s.btn} onPress={handleClose}>
              <Text style={s.btnText}>Close</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={s.linkBtn} onPress={handleShowLog}>
          <Text style={s.linkText}>Log</Text>
        </Pressable>
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
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 24,
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
    marginBottom: 8,
    lineHeight: 22,
  },
  detail: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 16,
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
    marginTop: 12,
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
