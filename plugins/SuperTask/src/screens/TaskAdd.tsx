/**
 * TaskAdd - Create a new task from the task viewer
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {loadConfig} from '../utils/config';
import {setConfigLoader, createTask} from '../api/todoist';
import {log, logError} from '../utils/debug';
import PriorityPicker from '../components/PriorityPicker';
import ProjectPicker from '../components/ProjectPicker';

type Nav = {
  push: (name: string, params?: Record<string, any>) => void;
  pop: () => void;
  resetTo: (name: string) => void;
  canGoBack: boolean;
};

type Props = {
  nav: Nav;
  projects: any[];
  defaultProjectId?: string;
};

export default function TaskAdd({nav, projects, defaultProjectId}: Props) {
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);
  const [dueString, setDueString] = useState('');
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId || null);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  setConfigLoader(loadConfig);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setStatus('Task title cannot be empty');
      return;
    }

    setSubmitting(true);
    setStatus('Adding to Todoist...');

    try {
      await createTask({
        content: content.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        priority,
        dueString: dueString.trim() || undefined,
      });
      log('TaskAdd', `Created task: ${content.trim()}`);
      setStatus('Task added!');
      setTimeout(() => nav.pop(), 500);
    } catch (err: any) {
      logError('TaskAdd', err);
      setStatus(`Error: ${err.message}`);
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.pop()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add Task</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="What needs to be done?"
          multiline
          autoFocus
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Due Date</Text>
        <TextInput
          style={styles.input}
          value={dueString}
          onChangeText={setDueString}
          placeholder="tomorrow, next monday, Jan 5..."
        />
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
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
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
