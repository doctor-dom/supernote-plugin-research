/**
 * TaskAdd - Create a new task from the task viewer
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {PluginManager, PluginNoteAPI, PluginCommAPI} from 'sn-plugin-lib';
import {loadConfig} from '../utils/config';
import {setConfigLoader, createTask} from '../api/todoist';
import {log, logError} from '../utils/debug';
import PriorityPicker from '../components/PriorityPicker';
import ProjectPicker from '../components/ProjectPicker';
import DatePicker from '../components/DatePicker';

type Nav = {
  push: (name: string, params?: Record<string, any>) => void;
  pop: () => void;
  replace: (name: string, params?: Record<string, any>) => void;
  resetTo: (name: string) => void;
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
  pageSize?: {width: number; height: number};
  lassoElementIds?: LassoElementId[];
};

type Props = {
  nav: Nav;
  projects: any[];
  defaultProjectId?: string;
  initialContent?: string;
  initialDescription?: string;
  captureMode?: 'lasso' | 'doc';
  noteContext?: NoteContext | null;
};

export default function TaskAdd({nav, projects, defaultProjectId, initialContent, initialDescription, captureMode, noteContext}: Props) {
  const [content, setContent] = useState(initialContent || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [priority, setPriority] = useState(1);
  const [dueString, setDueString] = useState('');
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId || null);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [createdTask, setCreatedTask] = useState<any>(null);

  const [postCreateAction, setPostCreateAction] = useState('prompt');
  const [debugMode, setDebugMode] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markDone, setMarkDone] = useState<'none' | 'handwriting' | 'text'>('none');
  const [markAsTextFontSize, setMarkAsTextFontSize] = useState(32);
  const [markAsTextLink, setMarkAsTextLink] = useState(false);

  useEffect(() => {
    log('TaskAdd', `MOUNT projects=${projects?.length} defaultProjectId=${defaultProjectId} captureMode=${captureMode || 'manual'} initialContent="${(initialContent || '').slice(0, 40)}"`);
    setConfigLoader(loadConfig);
    loadConfig().then(config => {
      if (config.postCreateAction) setPostCreateAction(config.postCreateAction);
      if (config.markAsTextFontSize) setMarkAsTextFontSize(config.markAsTextFontSize);
      if (config.markAsTextLink !== undefined) setMarkAsTextLink(config.markAsTextLink);
      if (config.debugMode) setDebugMode(true);
    });
  }, []);

  const handleSubmit = async () => {
    log('TaskAdd', `SUBMIT pressed content="${content.slice(0, 30)}" priority=${priority} dueString="${dueString}" projectId=${projectId}`);
    if (!content.trim()) {
      setStatus('Task title cannot be empty');
      return;
    }

    setSubmitting(true);
    setStatus('Adding to Todoist...');

    try {
      const task = await createTask({
        content: content.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        priority,
        dueString: dueString.trim() || undefined,
      });
      log('TaskAdd', `Created task: ${content.trim()} id=${task?.id} postCreateAction=${postCreateAction}`);
      setCreatedTask(task);

      // Auto-mark the handwriting on the STILL-ACTIVE original lasso.
      // Config ON: dashed border + Todoist link + T badge.
      // Config OFF: T badge only (no dashed border, no link).
      if (captureMode === 'lasso' && noteContext) {
        const {filePath, pageNum, bounds} = noteContext;
        try {
          setStatus('Marking handwriting...');

          // Config ON: dashed border + Todoist link on the active lasso
          if (markAsTextLink) {
            const taskUrl = task?.url || `https://app.todoist.com/app/task/${task?.id || ''}`;
            log('TaskAdd', `setLassoStrokeLink: destPath=${taskUrl.slice(0, 40)}`);
            await PluginNoteAPI.setLassoStrokeLink({
              destPath: taskUrl,
              destPage: 0,
              style: 2,
              linkType: 4,
            });
          }

          // Always insert T badge at top-left of handwriting bounds
          const badgeW = 26;
          const badgeH = 26;
          const badgeLeft = Math.max(0, bounds.left - badgeW - 4);
          const badgeTop = bounds.top;
          log('TaskAdd', `Inserting T badge: left=${badgeLeft} top=${badgeTop} w=${badgeW} h=${badgeH}`);
          await PluginNoteAPI.insertText({
            textContentFull: 'T',
            textRect: {
              left: badgeLeft,
              top: badgeTop,
              right: badgeLeft + badgeW,
              bottom: badgeTop + badgeH,
            },
            fontSize: 18,
            textBold: 1,
            textAlign: 1,
            textFrameStyle: 3,
            textEditable: 0,
            textItalics: 0,
            textFrameWidthType: 0,
          });
          await PluginNoteAPI.saveCurrentNote();

          setMarkDone('handwriting');
          log('TaskAdd', `Auto-mark applied (link=${markAsTextLink})`);
        } catch (err: any) {
          log('TaskAdd', `Auto-mark failed (non-fatal): ${err.message}`);
        }
      }

      setSubmitting(false);
      if (postCreateAction === 'auto-back') {
        setStatus('Task added!');
        setTimeout(() => nav.pop(), 500);
      } else {
        setStatus('Task added!');
        setJustCreated(true);
      }
    } catch (err: any) {
      logError('TaskAdd', err);
      setStatus(`Error: ${err.message}`);
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    log('TaskAdd', 'ADD ANOTHER pressed');
    setContent('');
    setDescription('');
    setDueString('');
    setShowDatePicker(false);
    setStatus('');
    setJustCreated(false);
    setCreatedTask(null);
    // Keep project and priority as defaults for rapid entry
  };

  const handleViewTask = () => {
    log('TaskAdd', `VIEW TASK pressed id=${createdTask?.id}`);
    if (createdTask) {
      setJustCreated(false);
      nav.replace('task-detail', {task: createdTask, projects});
    }
  };

  const handleDone = () => {
    log('TaskAdd', `DONE pressed captureMode=${captureMode || 'manual'}`);
    if (captureMode) {
      PluginManager.closePluginView();
    } else {
      nav.pop();
    }
  };

  const makeLassoRect = (rect: {left: number; top: number; right: number; bottom: number}) => ({
    left: rect.left - 10,
    top: rect.top - 10,
    right: rect.right + 10,
    bottom: rect.bottom + 10,
  });

  const handleConvertToText = async () => {
    if (!noteContext) return;
    const {bounds} = noteContext;
    log('TaskAdd', `CONVERT TO TEXT pressed`);
    setMarking(true);

    try {
      // Insert typed text at handwriting position (in-memory, lasso still active)
      const fontSize = markAsTextFontSize;
      const textHeight = Math.round(fontSize * 1.4);
      const textRect = {
        left: bounds.left,
        top: bounds.top,
        right: bounds.left + 200, // auto-width will resize
        bottom: bounds.top + textHeight,
      };

      log('TaskAdd', `insertText: l=${textRect.left} t=${textRect.top} fontSize=${fontSize}`);
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

      // Delete handwriting via the still-active lasso.
      // This avoids replaceElements entirely -- no 502/602 cross-reference
      // errors, no position shifts. The native layer handles cleanup.
      log('TaskAdd', 'Calling deleteLassoElements');
      const deleteResult = await PluginCommAPI.deleteLassoElements();
      log('TaskAdd', `deleteLassoElements result: ${JSON.stringify(deleteResult)}`);

      // Save to persist both the inserted text and the deletion
      await PluginNoteAPI.saveCurrentNote();
      log('TaskAdd', 'saveCurrentNote after delete');

      // Re-lasso the inserted text so user can reposition it
      try {
        const lr = makeLassoRect(textRect);
        log('TaskAdd', `Re-lasso text: ${JSON.stringify(lr)}`);
        const reLassoResult = await (PluginCommAPI as any).lassoElements(lr);
        log('TaskAdd', `Re-lasso result: ${JSON.stringify(reLassoResult)}`);

        // Config ON: apply dashed border + Todoist link to the text
        if (markAsTextLink && reLassoResult?.success) {
          const taskUrl = createdTask?.url || `https://app.todoist.com/app/task/${createdTask?.id || ''}`;
          await PluginNoteAPI.setLassoStrokeLink({
            destPath: taskUrl,
            destPage: 0,
            style: 2,
            linkType: 4,
          });
          log('TaskAdd', 'Applied Todoist link to converted text');
        }
      } catch (e: any) {
        log('TaskAdd', `Re-lasso failed: ${e.message}`);
      }

      setMarkDone('text');
    } catch (err: any) {
      logError('TaskAdd', `Convert to text failed: ${err.message}`);
    } finally {
      setMarking(false);
    }
  };

  return (
    <View style={styles.wrapper}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => {
          log('TaskAdd', 'BACK pressed');
          if (captureMode) {
            PluginManager.closePluginView();
          } else {
            nav.pop();
          }
        }}>
          <Text style={styles.backText}>{captureMode ? 'Close' : '< Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {captureMode === 'lasso' ? 'Captured Task' : captureMode === 'doc' ? 'From Document' : 'Add Task'}
        </Text>
        {debugMode ? (
          <Pressable onPress={() => { log('TaskAdd', 'LOG pressed'); nav.resetTo('debug'); }}>
            <Text style={styles.backText}>Log</Text>
          </Pressable>
        ) : <View />}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="What needs to be done?"
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Due Date</Text>
        <Pressable
          style={styles.input}
          onPress={() => { log('TaskAdd', 'DUE DATE pressed'); setShowDatePicker(true); }}>
          <Text style={dueString ? styles.inputValue : styles.inputPlaceholder}>
            {dueString || 'Tap to pick a date'}
          </Text>
        </Pressable>
        {showDatePicker && (
          <View style={styles.datePickerWrap}>
            <DatePicker
              value={dueString}
              onChange={(date) => { log('TaskAdd', `date selected: ${date}`); setDueString(date); }}
              onClose={() => setShowDatePicker(false)}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Priority</Text>
        <PriorityPicker value={priority} onChange={setPriority} />
      </View>

      {projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Project</Text>
          <ProjectPicker
            projects={projects}
            selectedId={projectId}
            onChange={setProjectId}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional notes"
          multiline
        />
      </View>

      <Pressable
        style={[styles.submitButton, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}>
        <Text style={[styles.submitText, submitting && styles.submitTextDisabled]}>
          {submitting ? 'Adding...' : 'Add to Todoist'}
        </Text>
      </Pressable>
    </ScrollView>
    {justCreated ? (
      <View style={styles.overlayCenter}>
        <View style={styles.overlayModal}>
          <Text style={styles.overlayText}>Task added!</Text>
          {captureMode === 'lasso' && noteContext && (
            <Text style={[styles.convertedLabel, markDone !== 'text' && {opacity: 0}]}>
              Handwriting converted to text.
            </Text>
          )}
          <View style={styles.overlayButtons}>
            {captureMode === 'lasso' && noteContext && markDone !== 'text' && (
              <Pressable
                style={styles.overlayButton}
                onPress={handleConvertToText}
                disabled={marking}>
                <Text style={styles.overlayButtonText}>
                  {marking ? 'Converting...' : 'Convert to Text'}
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.overlayButton} onPress={handleAddAnother}>
              <Text style={styles.overlayButtonText}>Add Another</Text>
            </Pressable>
            <Pressable style={styles.overlayButton} onPress={handleViewTask}>
              <Text style={styles.overlayButtonText}>View Task</Text>
            </Pressable>
            <Pressable style={[styles.overlayButton, styles.overlayButtonPrimary]} onPress={handleDone}>
              <Text style={[styles.overlayButtonText, styles.overlayButtonTextPrimary]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    ) : status ? (
      <View style={styles.statusBar}>
        <Text style={styles.statusBarText}>{status}</Text>
      </View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  inputValue: {
    fontSize: 16,
    color: '#000000',
  },
  inputPlaceholder: {
    fontSize: 16,
    color: '#999999',
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  datePickerWrap: {
    marginTop: 8,
  },
  submitButton: {
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#000000',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ffffff',
    borderColor: '#cccccc',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  submitTextDisabled: {
    color: '#cccccc',
  },
  overlayCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  overlayModal: {
    paddingVertical: 32,
    paddingHorizontal: 28,
    marginHorizontal: 20,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  overlayText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  convertedLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  markRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  markButton: {
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
  },
  markButtonDashed: {
    borderStyle: 'dashed',
  },
  markButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  markDoneLabel: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },
  overlayButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statusBar: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  statusBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  overlayButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
  },
  overlayButtonPrimary: {
    backgroundColor: '#000000',
  },
  overlayButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  overlayButtonTextPrimary: {
    color: '#ffffff',
  },
});
