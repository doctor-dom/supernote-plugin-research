/**
 * Capture screen - lasso handwriting or DOC text selection to Todoist
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {PluginManager, PluginCommAPI, PluginDocAPI} from 'sn-plugin-lib';
import {loadConfig, loadProjectCache} from '../utils/config';
import {setConfigLoader, createTask} from '../api/todoist';

type Props = {
  mode: 'lasso' | 'doc';
  onNavigate: (screen: string) => void;
};

export default function Capture({mode, onNavigate}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1); // Todoist: 1=normal, 4=urgent
  const [dueString, setDueString] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setConfigLoader(loadConfig);
    loadProjectCache().then(cached => {
      if (cached) setProjects(cached);
    });
    captureContent();
  }, []);

  const captureContent = async () => {
    if (mode === 'lasso') {
      await captureLasso();
    } else {
      await captureDocText();
    }
  };

  const captureLasso = async () => {
    setRecognizing(true);
    setStatus('Recognizing handwriting...');

    try {
      const elements = await PluginCommAPI.getLassoElements();
      if (!elements?.success || !elements?.result?.length) {
        setStatus('No elements selected. Lasso some handwriting first.');
        setRecognizing(false);
        return;
      }

      const recognized = await PluginCommAPI.recognizeElements(elements.result);
      if (!recognized?.success || !recognized?.result) {
        setStatus('Could not recognize handwriting.');
        setRecognizing(false);
        return;
      }

      setTitle(recognized.result.trim());

      // Get source context for the description
      const filePath = await PluginCommAPI.getCurrentFilePath();
      const pageNum = await PluginCommAPI.getCurrentPageNum();
      const fileName = filePath?.result?.split('/').pop()?.replace('.note', '') || 'note';
      const page = pageNum?.result ?? '?';
      setDescription(`From: ${fileName} p.${page}`);
      setStatus('');
    } catch (err: any) {
      setStatus(`Recognition error: ${err.message}`);
    } finally {
      setRecognizing(false);
    }
  };

  const captureDocText = async () => {
    try {
      let text = '';
      try {
        const selected = await PluginDocAPI.getLastSelectedText();
        if (selected?.success && selected?.result) {
          text = selected.result;
        }
      } catch {
        // Fallback for older SDK
        const fallback = await PluginDocAPI.getSelectedText();
        if (fallback?.success && fallback?.result) {
          text = fallback.result;
        }
      }

      if (!text) {
        setStatus('No text selected. Highlight some text first.');
        return;
      }

      setTitle(text.trim());
      const filePath = await PluginCommAPI.getCurrentFilePath();
      const fileName = filePath?.result?.split('/').pop() || 'document';
      setDescription(`From: ${fileName}`);
    } catch (err: any) {
      setStatus(`Capture error: ${err.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setStatus('Task title cannot be empty');
      return;
    }

    setSubmitting(true);
    setStatus('Adding to Todoist...');

    try {
      await createTask({
        content: title.trim(),
        description: description.trim() || undefined,
        projectId: selectedProjectId || undefined,
        priority,
        dueString: dueString.trim() || undefined,
      });
      setStatus('Task added!');
      // Brief pause to show success, then close
      setTimeout(() => PluginManager.closePluginView(), 800);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    PluginManager.closePluginView();
  };

  if (recognizing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Recognizing handwriting...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Task to Todoist</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          multiline
        />
        <Text style={styles.hint}>Edit if recognition is wrong</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {[4, 3, 2, 1].map(p => (
            <Pressable
              key={p}
              style={[
                styles.priorityButton,
                priority === p && styles.prioritySelected,
              ]}
              onPress={() => setPriority(p)}>
              <Text
                style={[
                  styles.priorityText,
                  priority === p && styles.priorityTextSelected,
                ]}>
                {p === 4 ? 'P1' : p === 3 ? 'P2' : p === 2 ? 'P3' : 'P4'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Due date</Text>
        <TextInput
          style={styles.input}
          value={dueString}
          onChangeText={setDueString}
          placeholder="tomorrow, next monday, Jan 5..."
        />
        <Text style={styles.hint}>Todoist parses natural language dates</Text>
      </View>

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
        <Text style={styles.submitText}>
          {submitting ? 'Adding...' : 'Add to Todoist'}
        </Text>
      </Pressable>

      {status ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  closeText: {
    fontSize: 16,
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
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    color: '#666666',
    marginTop: 6,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
  },
  prioritySelected: {
    backgroundColor: '#000000',
  },
  priorityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  priorityTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    borderColor: '#999999',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  statusBox: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 14,
    color: '#000000',
  },
});
