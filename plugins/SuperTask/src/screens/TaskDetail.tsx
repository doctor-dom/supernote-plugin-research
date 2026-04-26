/**
 * TaskDetail - View/edit/complete/delete a task
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
import {setConfigLoader, updateTask, completeTask, deleteTask} from '../api/todoist';
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
  task: any;
  projects: any[];
};

export default function TaskDetail({nav, task, projects}: Props) {
  const [content, setContent] = useState(task.content || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 1);
  const [dueString, setDueString] = useState(task.due?.string || task.due?.date || '');
  const [projectId, setProjectId] = useState(task.project_id || null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  setConfigLoader(loadConfig);

  const isDirty =
    content !== (task.content || '') ||
    description !== (task.description || '') ||
    priority !== (task.priority || 1) ||
    dueString !== (task.due?.string || task.due?.date || '') ||
    projectId !== (task.project_id || null);

  const handleSave = async () => {
    if (!content.trim()) {
      setStatus('Task title cannot be empty');
      return;
    }

    setSaving(true);
    setStatus('Saving...');

    try {
      await updateTask(task.id, {
        content: content.trim(),
        description: description.trim(),
        priority,
        dueString: dueString.trim() || undefined,
        projectId: projectId || undefined,
      });
      setStatus('Saved');
      log('TaskDetail', `Updated task ${task.id}`);
      setTimeout(() => nav.pop(), 500);
    } catch (err: any) {
      logError('TaskDetail', err);
      setStatus(`Error: ${err.message}`);
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setStatus('Completing...');
    try {
      await completeTask(task.id);
      log('TaskDetail', `Completed task ${task.id}`);
      setStatus('Done!');
      setTimeout(() => nav.pop(), 500);
    } catch (err: any) {
      logError('TaskDetail', err);
      setStatus(`Error: ${err.message}`);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setSaving(true);
    setStatus('Deleting...');
    try {
      await deleteTask(task.id);
      log('TaskDetail', `Deleted task ${task.id}`);
      setStatus('Deleted');
      setTimeout(() => nav.pop(), 500);
    } catch (err: any) {
      logError('TaskDetail', err);
      setStatus(`Error: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.pop()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Task</Text>
        <Pressable onPress={handleDelete}>
          <Text style={styles.deleteText}>
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="Task title"
          multiline
        />
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

      <Pressable
        style={[styles.completeButton]}
        onPress={handleComplete}
        disabled={saving}>
        <Text style={styles.completeText}>Mark Complete</Text>
      </Pressable>

      <Pressable
        style={[styles.saveButton, (!isDirty || saving) && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isDirty || saving}>
        <Text style={[styles.saveText, (!isDirty || saving) && styles.saveTextDisabled]}>
          {saving ? 'Saving...' : 'Save Changes'}
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
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
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
  completeButton: {
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  saveButton: {
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
  saveText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  saveTextDisabled: {
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
