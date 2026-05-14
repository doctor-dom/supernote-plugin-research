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

// EMR digitizer maximum values
const EMR_NORMAL = {portrait: {maxX: 15819, maxY: 11864}, landscape: {maxX: 11864, maxY: 15819}};
const EMR_A5X2   = {portrait: {maxX: 21632, maxY: 16224}, landscape: {maxX: 16224, maxY: 21632}};

function getEmrMaximums(pageSize: {width: number; height: number}, emrMaxX: number, emrMaxY: number) {
  const isPortrait = pageSize.width <= pageSize.height;
  const usesA5X2 = emrMaxX > 15819 || emrMaxY > 11864;
  const range = usesA5X2 ? EMR_A5X2 : EMR_NORMAL;
  return isPortrait ? range.portrait : range.landscape;
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
  const [markAsTextLink, setMarkAsTextLink] = useState(false);

  useEffect(() => {
    log('QuickAdd', 'MOUNT');
    setConfigLoader(loadConfig);
    loadConfig().then(config => {
      if (config.defaultProjectId) setProjectId(config.defaultProjectId);
      if (config.markAsTextFontSize) setMarkAsTextFontSize(config.markAsTextFontSize);
      if (config.markAsTextLink !== undefined) setMarkAsTextLink(config.markAsTextLink);
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

    // OCR
    log('QuickAdd', `recognizeElements: ${elements.result.length} elements, size=${pageSize.width}x${pageSize.height}`);
    setStatusText('Recognizing handwriting...');
    const recognized = await withTimeout(
      PluginCommAPI.recognizeElements(elements.result, pageSize),
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

    // Compute bounding box from stroke points
    let bounds = null;
    try {
      let emrMaxX = 0, emrMaxY = 0;
      for (const el of elements.result) {
        if (el.maxX !== undefined && el.maxX > emrMaxX) emrMaxX = el.maxX;
        if (el.maxY !== undefined && el.maxY > emrMaxY) emrMaxY = el.maxY;
      }

      const {maxX: realMaxX, maxY: realMaxY} = getEmrMaximums(pageSize, emrMaxX, emrMaxY);
      const scaleX = realMaxX / (pageSize.height - 1);
      const scaleY = realMaxY / (pageSize.width - 1);

      let sMinX = Infinity, sMinY = Infinity, sMaxX = 0, sMaxY = 0;
      let pointsRead = 0;
      for (const el of elements.result) {
        if (!el.stroke?.points?._size) continue;
        try {
          const pts = el.stroke.points;
          const first = await pts.get(0);
          const last = await pts.get(pts._size - 1);
          for (const pt of [first, last]) {
            if (pt?.x !== undefined && pt?.y !== undefined) {
              if (pt.x < sMinX) sMinX = pt.x;
              if (pt.x > sMaxX) sMaxX = pt.x;
              if (pt.y < sMinY) sMinY = pt.y;
              if (pt.y > sMaxY) sMaxY = pt.y;
              pointsRead++;
            }
          }
        } catch (e: any) {
          log('QuickAdd', `Stroke point read error: ${e.message}`);
        }
      }

      if (pointsRead > 0 && sMinX !== Infinity) {
        const pxLeft = Math.round(pageSize.width - 1 - sMaxY / scaleY);
        const pxTop = Math.round(sMinX / scaleX);
        const pxRight = Math.round(pageSize.width - 1 - sMinY / scaleY);
        const pxBottom = Math.round(sMaxX / scaleX);
        bounds = {
          left: Math.min(pxLeft, pxRight),
          top: Math.min(pxTop, pxBottom),
          right: Math.max(pxLeft, pxRight),
          bottom: Math.max(pxTop, pxBottom),
        };
        log('QuickAdd', `Pixel bounds: l=${bounds.left} t=${bounds.top} r=${bounds.right} b=${bounds.bottom}`);
      }
    } catch (e: any) {
      log('QuickAdd', `Bounds calc failed: ${e.message}`);
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
      const task = await createTask({
        content: content.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        priority,
      });
      log('QuickAdd', `Created task id=${task?.id}`);
      createdTaskRef.current = task;

      setPhase('success');
    } catch (err: any) {
      logError('QuickAdd', err);
      setErrorText(`Error: ${err.message}`);
      setPhase('error');
    }
  };

  const applyStrokeLink = async (rect: {left: number; top: number; right: number; bottom: number}, filePath: string, pageNum: number) => {
    const lassoRect = {
      left: rect.left - 4,
      top: rect.top - 4,
      right: rect.right + 4,
      bottom: rect.bottom + 4,
    };
    log('QuickAdd', `lassoElements: ${JSON.stringify(lassoRect)}`);
    const lassoResult = await (PluginCommAPI as any).lassoElements(lassoRect);

    if (lassoResult?.success) {
      const task = createdTaskRef.current;
      const taskUrl = task?.url || `https://app.todoist.com/app/task/${task?.id || ''}`;
      const destPath = markAsTextLink ? taskUrl : filePath || taskUrl;
      const linkType = markAsTextLink ? 4 : 0;
      log('QuickAdd', `setLassoStrokeLink: linkEnabled=${markAsTextLink} destPath=${destPath.slice(0, 40)}`);
      await PluginNoteAPI.setLassoStrokeLink({
        destPath,
        destPage: markAsTextLink ? 0 : pageNum,
        style: 2,
        linkType,
      });
    } else {
      log('QuickAdd', `lassoElements failed: ${JSON.stringify(lassoResult)}`);
    }
  };

  const handleMark = async () => {
    const noteContext = noteContextRef.current;
    if (!noteContext) return;
    const {filePath, pageNum, bounds} = noteContext;
    log('QuickAdd', 'MARK (handwriting) pressed');
    setMarking(true);

    try {
      await PluginNoteAPI.saveCurrentNote();
      await applyStrokeLink(bounds, filePath, pageNum);
      setMarkDone('handwriting');
    } catch (err: any) {
      logError('QuickAdd', `Mark handwriting failed: ${err.message}`);
    } finally {
      setMarking(false);
    }
  };

  const handleMarkAsText = async () => {
    const noteContext = noteContextRef.current;
    if (!noteContext) return;
    const {filePath, pageNum, bounds, lassoElementIds} = noteContext;
    log('QuickAdd', `MARK AS TEXT pressed lassoIds=${lassoElementIds?.length ?? 0}`);
    setMarking(true);

    try {
      await PluginNoteAPI.saveCurrentNote();

      // Insert typed text FIRST while note context is still active
      const fontSize = markAsTextFontSize;
      const textHeight = Math.round(fontSize * 1.4);
      const estCharWidth = fontSize * 0.6;
      const textWidth = Math.max(100, Math.round(content.trim().length * estCharWidth + 20));
      const textRect = {
        left: bounds.left,
        top: bounds.top,
        right: bounds.left + textWidth,
        bottom: bounds.top + textHeight,
      };

      log('QuickAdd', `insertText: l=${textRect.left} t=${textRect.top} w=${textWidth} h=${textHeight}`);
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

      // Remove handwriting strokes via getElements/replaceElements
      if (lassoElementIds?.length && filePath) {
        const lassoNums = new Set(lassoElementIds.map(el => el.numInPage));
        const getResult = await PluginFileAPI.getElements(pageNum, filePath) as any;

        if (getResult?.success && getResult?.result) {
          const pageEls = getResult.result;
          const filtered = pageEls.filter((el: any) => {
            if (lassoNums.has(el.numInPage)) return false;
            if (el.type === 600 && el.link?.controlTrailNums) {
              const refs: number[] = el.link.controlTrailNums;
              if (refs.some((n: number) => lassoNums.has(n))) {
                log('QuickAdd', `Removing link el numInPage=${el.numInPage}`);
                return false;
              }
            }
            return true;
          });

          log('QuickAdd', `replaceElements: ${pageEls.length} -> ${filtered.length}`);
          await PluginFileAPI.replaceElements(filePath, pageNum, filtered);

          try {
            await PluginCommAPI.reloadFile();
          } catch (e: any) {
            log('QuickAdd', `reloadFile failed: ${e.message}`);
          }
        }
      }

      // Re-lasso the inserted text and apply dashed border
      const insertedRect = {left: bounds.left, top: bounds.top, right: bounds.left + textWidth, bottom: bounds.top + textHeight};
      try {
        await applyStrokeLink(insertedRect, filePath, pageNum);
      } catch (e: any) {
        log('QuickAdd', `applyStrokeLink on text failed: ${e.message}`);
      }

      setMarkDone('text');
    } catch (err: any) {
      logError('QuickAdd', `Mark as text failed: ${err.message}`);
    } finally {
      setMarking(false);
    }
  };

  const handleDone = () => {
    log('QuickAdd', 'DONE pressed');
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
      const canMark = noteContextRef.current && markDone === 'none';
      return (
        <View style={s.panelBody}>
          <Text style={s.successText}>Task added!</Text>
          {noteContextRef.current && markDone !== 'none' && (
            <Text style={s.markDoneLabel}>
              {markDone === 'handwriting' ? 'Marked' : 'Marked as text'}
            </Text>
          )}
          {canMark && (
            <View style={s.markRow}>
              <Pressable
                style={[s.markBtn, {flex: 1}]}
                onPress={handleMark}
                disabled={marking}>
                <Text style={s.markBtnText}>
                  {marking ? 'Marking...' : 'Mark'}
                </Text>
              </Pressable>
              <Pressable
                style={[s.markBtn, s.markBtnDashed, {flex: 1}]}
                onPress={handleMarkAsText}
                disabled={marking}>
                <Text style={s.markBtnText}>
                  {marking ? 'Marking...' : 'Mark as Text'}
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable style={s.viewTasksBtn} onPress={handleViewTasks}>
            <Text style={s.viewTasksBtnText}>View Tasks</Text>
          </Pressable>
          <Pressable style={s.doneBtn} onPress={handleDone}>
            <Text style={s.doneBtnText}>Done</Text>
          </Pressable>
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
  markDoneLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
  },
  viewTasksBtn: {
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  viewTasksBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  doneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#000000',
    alignSelf: 'stretch',
  },
  doneBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});
