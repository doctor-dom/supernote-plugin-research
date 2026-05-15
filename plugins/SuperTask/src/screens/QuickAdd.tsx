/**
 * QuickAdd - Compact overlay for lasso capture + task creation
 *
 * Combines OCR capture and a streamlined add form in a centered panel
 * over the note page. Transparent background lets the note show through.
 * Tap outside the panel to dismiss.
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {PluginManager, PluginCommAPI, PluginNoteAPI, PluginFileAPI} from 'sn-plugin-lib';
import {loadConfig} from '../utils/config';
import {setConfigLoader, createTask, getProjects} from '../api/todoist';
import {log, logError} from '../utils/debug';
import PriorityPicker from '../components/PriorityPicker';
import ProjectPicker from '../components/ProjectPicker';

type Nav = {
  push: (name: string, params?: Record<string, any>) => void;
  pop: () => void;
  resetTo: (name: string, params?: Record<string, any>) => void;
  canGoBack: boolean;
};

type LassoElementId = {
  uuid: string;
  numInPage: number;
  type: number;
};

type NoteContext = {
  filePath: string;
  pageNum: number;
  bounds: {left: number; top: number; right: number; bottom: number};
  pageSize: {width: number; height: number};
  lassoElementIds: LassoElementId[];
};

// Timeout wrapper -- SDK calls can hang forever on device
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

type Phase = 'recognizing' | 'ready' | 'submitting' | 'success' | 'error';

export default function QuickAdd({nav}: {nav: Nav}) {
  const [phase, setPhase] = useState<Phase>('recognizing');
  const [statusText, setStatusText] = useState('Recognizing...');
  const [errorText, setErrorText] = useState('');

  // Form state
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  // Note context from capture
  const noteContextRef = useRef<NoteContext | null>(null);
  const createdTaskRef = useRef<any>(null);

  // Marking state (both options are mutually exclusive)
  const [marking, setMarking] = useState(false);
  const [markDone, setMarkDone] = useState<'none' | 'handwriting' | 'text'>('none');
  const [markAsTextFontSize, setMarkAsTextFontSize] = useState(32);

  useEffect(() => {
    log('QuickAdd', 'MOUNT');
    setConfigLoader(loadConfig);
    loadConfig().then(config => {
      if (config.defaultProjectId) setProjectId(config.defaultProjectId);
      if (config.markAsTextFontSize) setMarkAsTextFontSize(config.markAsTextFontSize);
    });
    runCapture();
  }, []);

  const runCapture = async () => {
    try {
      setPhase('recognizing');
      setStatusText('Recognizing...');

      // Start OCR and project fetch in parallel
      const [captureResult, projectResult] = await Promise.all([
        captureLasso(),
        fetchProjects(),
      ]);

      if (!captureResult) return; // error already shown

      setContent(captureResult.content);
      setDescription(captureResult.description);
      noteContextRef.current = captureResult.noteContext;
      if (projectResult) setProjects(projectResult);

      setPhase('ready');
    } catch (err: any) {
      logError('QuickAdd', err);
      setErrorText(`Unexpected error: ${err.message}`);
      setPhase('error');
    }
  };

  const fetchProjects = async () => {
    try {
      const result = await withTimeout(getProjects(), 8000, 'getProjects');
      log('QuickAdd', `Got ${result?.length ?? 0} projects`);
      return result || [];
    } catch (err: any) {
      log('QuickAdd', `Project fetch failed (non-fatal): ${err.message}`);
      return [];
    }
  };

  const captureLasso = async (): Promise<{content: string; description: string; noteContext: NoteContext | null} | null> => {
    log('QuickAdd', 'captureLasso: calling getLassoElements...');

    const elements = await withTimeout(
      PluginCommAPI.getLassoElements(),
      10000,
      'getLassoElements',
    );
    log('QuickAdd', `getLassoElements: success=${elements?.success} count=${elements?.result?.length ?? 0}`);

    if (!elements?.success || !elements?.result?.length) {
      setErrorText('No elements selected. Lasso some handwriting first.');
      setPhase('error');
      return null;
    }

    // Get page context
    let filePath = '';
    let pageNum = 0;
    try {
      const fp = await withTimeout(PluginCommAPI.getCurrentFilePath(), 3000, 'getCurrentFilePath');
      filePath = fp?.result || '';
      log('QuickAdd', `filePath: ${filePath}`);
    } catch (e: any) {
      log('QuickAdd', `getCurrentFilePath failed: ${e.message}`);
    }
    try {
      const pn = await withTimeout(PluginCommAPI.getCurrentPageNum(), 3000, 'getCurrentPageNum');
      pageNum = pn?.result ?? 0;
      log('QuickAdd', `pageNum: ${pageNum}`);
    } catch (e: any) {
      log('QuickAdd', `getCurrentPageNum failed: ${e.message}`);
    }

    // Get page size (required by recognizeElements)
    let pageSize = {width: 1404, height: 1872};
    if (filePath) {
      try {
        const ps = await withTimeout(PluginFileAPI.getPageSize(filePath, pageNum), 5000, 'getPageSize');
        if (ps?.result) pageSize = ps.result;
        else if (ps?.width && ps?.height) pageSize = ps;
      } catch (e: any) {
        log('QuickAdd', `getPageSize failed, using default: ${e.message}`);
      }
    }

    // OCR -- only pass stroke elements (type 200). Non-stroke elements
    // (text boxes, links, T badges) confuse the recognizer and cause null results.
    const strokeElements = elements.result.filter((el: any) => el.type === 200);
    log('QuickAdd', `recognizeElements: ${strokeElements.length} strokes of ${elements.result.length} total, size=${pageSize.width}x${pageSize.height}`);
    setStatusText('Recognizing handwriting...');
    const recognized = await withTimeout(
      PluginCommAPI.recognizeElements(strokeElements.length > 0 ? strokeElements : elements.result, pageSize),
      30000,
      'recognizeElements',
    );

    log('QuickAdd', `recognizeElements result: success=${recognized?.success} hasResult=${!!recognized?.result} raw=${JSON.stringify(recognized).slice(0, 200)}`);

    if (!recognized?.success || !recognized?.result) {
      setErrorText('Could not recognize handwriting. Try selecting clearer text.');
      setPhase('error');
      return null;
    }

    const capturedContent = recognized.result.trim();
    log('QuickAdd', `Recognized: "${capturedContent.slice(0, 60)}"`);

    // Get exact lasso bounds in pixel coordinates from the active selection
    let bounds = null;
    try {
      const lassoRect = await withTimeout(PluginCommAPI.getLassoRect(), 3000, 'getLassoRect');
      if (lassoRect?.success && lassoRect.result) {
        bounds = lassoRect.result;
        log('QuickAdd', `getLassoRect: l=${bounds.left} t=${bounds.top} r=${bounds.right} b=${bounds.bottom}`);
      } else {
        log('QuickAdd', `getLassoRect failed: ${JSON.stringify(lassoRect)}`);
      }
    } catch (e: any) {
      log('QuickAdd', `getLassoRect error: ${e.message}`);
    }

    // Collect element IDs for Mark as Text (no marking until user confirms)
    const lassoElementIds = elements.result.map((el: any) => ({
      uuid: el.uuid,
      numInPage: el.numInPage,
      type: el.type,
    }));

    const fileName = filePath?.split('/').pop()?.replace('.note', '') || 'note';
    const noteDescription = `From: ${fileName} p.${pageNum}`;

    const noteContext = bounds ? {filePath, pageNum, bounds, pageSize, lassoElementIds} : null;
    return {content: capturedContent, description: noteDescription, noteContext};
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    log('QuickAdd', `SUBMIT: "${content.trim().slice(0, 30)}" priority=${priority} projectId=${projectId}`);

    setPhase('submitting');
    setStatusText('Adding to Todoist...');

    try {
      // Build description with note context back-reference
      let fullDescription = description.trim();
      const nc = noteContextRef.current;
      if (nc) {
        const noteFile = nc.filePath.split('/').pop() || '';
        const noteRef = `\n\n---\n[SuperTask] Captured from: ${noteFile} p.${nc.pageNum}`;
        fullDescription = fullDescription ? fullDescription + noteRef : noteRef.trim();
      }

      const task = await createTask({
        content: content.trim(),
        description: fullDescription || undefined,
        projectId: projectId || undefined,
        priority,
      });
      log('QuickAdd', `Created task id=${task?.id}`);
      createdTaskRef.current = task;

      // Don't mark yet -- lasso context stays alive until the user
      // picks "Done" (mark handwriting) or "Convert to Text" (delete + replace).
      setPhase('success');
    } catch (err: any) {
      logError('QuickAdd', err);
      setErrorText(`Error: ${err.message}`);
      setPhase('error');
    }
  };

  const lassoRect = (rect: {left: number; top: number; right: number; bottom: number}) => ({
    left: rect.left - 10,
    top: rect.top - 10,
    right: rect.right + 10,
    bottom: rect.bottom + 10,
  });

  const handleConvertToText = async () => {
    const noteContext = noteContextRef.current;
    if (!noteContext) return;
    const {bounds} = noteContext;
    log('QuickAdd', `CONVERT TO TEXT pressed`);
    setMarking(true);

    try {
      // Step 1: Delete handwriting on the STILL-ACTIVE original lasso.
      log('QuickAdd', 'Calling deleteLassoElements (original lasso)');
      const deleteResult = await PluginCommAPI.deleteLassoElements();
      log('QuickAdd', `deleteLassoElements result: ${JSON.stringify(deleteResult)}`);

      // Step 2: Save and reload to flush deletion to display
      await PluginNoteAPI.saveCurrentNote();
      log('QuickAdd', 'saveCurrentNote after delete');
      try {
        const reloadResult = await PluginCommAPI.reloadFile();
        log('QuickAdd', `reloadFile result: ${JSON.stringify(reloadResult)}`);
      } catch (e: any) {
        log('QuickAdd', `reloadFile failed: ${e.message}`);
      }

      // Step 3: Insert typed text where handwriting was
      const fontSize = markAsTextFontSize;
      const textHeight = Math.round(fontSize * 1.4);
      const textContent = content.trim();
      const estCharWidth = Math.round(fontSize * 0.55);
      const textWidth = Math.max(80, textContent.length * estCharWidth + 16);
      const textRect = {
        left: bounds.left,
        top: bounds.top,
        right: bounds.left + textWidth,
        bottom: bounds.top + textHeight,
      };
      log('QuickAdd', `insertText: l=${textRect.left} t=${textRect.top} fontSize=${fontSize}`);
      await PluginNoteAPI.insertText({
        textContentFull: content.trim(),
        textRect,
        fontSize,
        textBold: 0,
        textAlign: 0,
        textFrameStyle: 0,
        textEditable: 0,
        textItalics: 0,
        textFrameWidthType: 1,
      });

      // Step 4: Save after text insertion
      await PluginNoteAPI.saveCurrentNote();
      log('QuickAdd', 'saveCurrentNote after convert');

      // Step 5: Lasso text to apply supertask link, then re-lasso for repositioning
      try {
        const lr = lassoRect(textRect);
        log('QuickAdd', `Lasso for link: ${JSON.stringify(lr)}`);
        const linkLasso = await (PluginCommAPI as any).lassoElements(lr);
        if (linkLasso?.success) {
          const task = createdTaskRef.current;
          const destPath = `supertask://task/${task?.id}`;
          log('QuickAdd', `setLassoStrokeLink: destPath=${destPath}`);
          const linkResult = await PluginNoteAPI.setLassoStrokeLink({
            destPath,
            destPage: 0,
            style: 2,
            linkType: 4,
          });
          log('QuickAdd', `setLassoStrokeLink result: ${JSON.stringify(linkResult)}`);
          await PluginNoteAPI.saveCurrentNote();
        }

        // Final lasso: select the text for repositioning (persists after plugin closes)
        const lr2 = lassoRect(textRect);
        log('QuickAdd', `Re-lasso text: ${JSON.stringify(lr2)}`);
        const reLassoResult = await (PluginCommAPI as any).lassoElements(lr2);
        log('QuickAdd', `Re-lasso result: ${JSON.stringify(reLassoResult)}`);
      } catch (e: any) {
        log('QuickAdd', `Re-lasso text failed: ${e.message}`);
      }

      setMarkDone('text');
    } catch (err: any) {
      logError('QuickAdd', `Convert to text failed: ${err.message}`);
    } finally {
      setMarking(false);
    }
  };

  const handleDone = async () => {
    log('QuickAdd', 'DONE pressed');

    // If convert is in progress, ignore Done press
    if (marking) {
      log('QuickAdd', 'Ignoring Done -- convert in progress');
      return;
    }

    // If convert-to-text already ran, marks are applied -- just close.
    if (markDone !== 'none' || !createdTaskRef.current || !noteContextRef.current) {
      PluginManager.closePluginView();
      return;
    }

    // Mark handwriting: dashed border with supertask link on the still-active lasso
    const {bounds} = noteContextRef.current;
    const task = createdTaskRef.current;
    try {
      const destPath = `supertask://task/${task?.id}`;
      log('QuickAdd', `setLassoStrokeLink: destPath=${destPath}`);
      const markResult = await PluginNoteAPI.setLassoStrokeLink({
        destPath,
        destPage: 0,
        style: 2,
        linkType: 4,
      });
      log('QuickAdd', `setLassoStrokeLink result: ${JSON.stringify(markResult)}`);
      await PluginNoteAPI.saveCurrentNote();
      log('QuickAdd', 'Auto-mark applied');

      // Re-lasso the handwriting so user can reposition after plugin closes
      try {
        const lr = lassoRect(bounds);
        log('QuickAdd', `Re-lasso handwriting: ${JSON.stringify(lr)}`);
        const reLasso = await (PluginCommAPI as any).lassoElements(lr);
        log('QuickAdd', `Re-lasso result: ${JSON.stringify(reLasso)}`);
      } catch (e: any) {
        log('QuickAdd', `Re-lasso failed: ${e.message}`);
      }
    } catch (err: any) {
      log('QuickAdd', `Auto-mark on Done failed (non-fatal): ${err.message}`);
    }

    PluginManager.closePluginView();
  };

  const handleViewTasks = () => {
    log('QuickAdd', 'VIEW TASKS pressed');
    nav.resetTo('task-home');
  };

  const handleDismiss = () => {
    log('QuickAdd', 'DISMISS (tap outside)');
    PluginManager.closePluginView();
  };

  // Render panel content based on phase
  const renderPanelContent = () => {
    if (phase === 'recognizing') {
      return (
        <View style={s.panelBody}>
          <Text style={s.phaseText}>{statusText}</Text>
        </View>
      );
    }

    if (phase === 'error') {
      return (
        <View style={s.panelBody}>
          <Text style={s.errorText}>{errorText}</Text>
          <View style={s.buttonRow}>
            <Pressable style={s.btn} onPress={() => { setErrorText(''); runCapture(); }}>
              <Text style={s.btnText}>Retry</Text>
            </Pressable>
            <Pressable style={s.btn} onPress={handleDone}>
              <Text style={s.btnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (phase === 'submitting') {
      return (
        <View style={s.panelBody}>
          <Text style={s.phaseText}>{statusText}</Text>
        </View>
      );
    }

    if (phase === 'success') {
      const canConvert = noteContextRef.current && markDone !== 'text';
      return (
        <View style={s.panelBody}>
          <Text style={s.successText}>Task added!</Text>
          <Text style={[s.convertedLabel, markDone !== 'text' && {opacity: 0}]}>
            Handwriting converted to text.
          </Text>
          <View style={s.successRow}>
            {canConvert && (
              <Pressable
                style={s.successBtn}
                onPress={handleConvertToText}
                disabled={marking}>
                <Text style={s.successBtnText}>
                  {marking ? 'Converting...' : 'Convert to Text'}
                </Text>
              </Pressable>
            )}
            <Pressable style={s.successBtn} onPress={handleViewTasks}>
              <Text style={s.successBtnText}>View Tasks</Text>
            </Pressable>
            <Pressable style={[s.successBtn, s.successBtnPrimary]} onPress={handleDone} disabled={marking}>
              <Text style={[s.successBtnText, s.successBtnPrimaryText]}>Done</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // phase === 'ready'
    return (
      <ScrollView style={s.panelScroll} keyboardShouldPersistTaps="handled">
        <View style={s.field}>
          <Text style={s.label}>Task</Text>
          <TextInput
            style={s.input}
            value={content}
            onChangeText={setContent}
            multiline
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Priority</Text>
          <PriorityPicker value={priority} onChange={setPriority} />
        </View>

        {projects.length > 0 && (
          <View style={s.field}>
            <Text style={s.label}>Project</Text>
            <ProjectPicker
              projects={projects}
              selectedId={projectId}
              onChange={setProjectId}
            />
          </View>
        )}

        <View style={s.field}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.inputDesc]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes"
            multiline
          />
        </View>

        <Pressable style={s.submitBtn} onPress={handleSubmit}>
          <Text style={s.submitBtnText}>Add to Todoist</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <Pressable style={s.overlay} onPress={handleDismiss}>
      <Pressable style={s.panel} onPress={(e) => e.stopPropagation()}>
        <View style={s.panelHeader}>
          <Text style={s.panelTitle}>
            {phase === 'success' ? 'Done' : phase === 'error' ? 'Error' : 'Quick Add'}
          </Text>
          <View style={s.headerRight}>
            {phase === 'ready' && (
              <Pressable style={s.tasksLink} onPress={handleViewTasks}>
                <Text style={s.tasksLinkText}>Tasks</Text>
              </Pressable>
            )}
            <Pressable style={s.closeBtn} onPress={handleDone}>
              <Text style={s.closeBtnText}>X</Text>
            </Pressable>
          </View>
        </View>
        {renderPanelContent()}
      </Pressable>
    </Pressable>
  );
}

const PANEL_WIDTH = 700;

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: PANEL_WIDTH,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tasksLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tasksLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  panelBody: {
    padding: 20,
    alignItems: 'center',
  },
  panelScroll: {
    padding: 20,
    maxHeight: 500,
  },
  phaseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  convertedLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    color: '#000000',
    minHeight: 44,
  },
  inputDesc: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  submitBtn: {
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#000000',
    marginBottom: 8,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  markRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  markBtn: {
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
  },
  markBtnDashed: {
    borderStyle: 'dashed',
  },
  markBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  successRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  successBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
  },
  successBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  successBtnPrimary: {
    backgroundColor: '#000000',
  },
  successBtnPrimaryText: {
    color: '#ffffff',
  },
});
