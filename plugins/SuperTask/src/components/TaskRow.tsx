/**
 * TaskRow - Reusable task row with checkbox, content, priority, and due date
 */

import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {log} from '../utils/debug';

const PRIORITY_LABELS: Record<number, string> = {
  4: 'P1',
  3: 'P2',
  2: 'P3',
  1: '',
};

type Props = {
  task: any;
  onComplete: (taskId: string) => void;
  onPress: (task: any) => void;
  showProject?: string;
};

export default function TaskRow({task, onComplete, onPress, showProject}: Props) {
  const priorityLabel = PRIORITY_LABELS[task.priority] || '';
  const dueDate = task.due?.date || '';
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = dueDate && dueDate < today;
  const isToday = dueDate === today;

  let dueText = '';
  if (isToday) {
    dueText = 'today';
  } else if (isOverdue) {
    dueText = `overdue (${formatDate(dueDate)})`;
  } else if (dueDate) {
    dueText = formatDate(dueDate);
  }

  return (
    <Pressable style={styles.row} onPress={() => { log('TaskRow', `ROW pressed id=${task.id}`); onPress(task); }}>
      <Pressable
        style={styles.checkbox}
        onPress={() => { log('TaskRow', `CHECKBOX pressed id=${task.id}`); onComplete(task.id); }}>
        <Text style={styles.checkboxText}>○</Text>
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.title}>{task.content}</Text>
        <View style={styles.meta}>
          {priorityLabel ? (
            <Text style={[styles.priority, task.priority === 4 && styles.priorityUrgent]}>
              {priorityLabel}
            </Text>
          ) : null}
          {dueText ? (
            <Text style={[styles.due, isOverdue && styles.dueOverdue]}>
              {dueText}
            </Text>
          ) : null}
          {showProject ? (
            <Text style={styles.project}>{showProject}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 22,
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  priority: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  priorityUrgent: {
    fontWeight: '900',
  },
  due: {
    fontSize: 13,
    color: '#666666',
  },
  dueOverdue: {
    fontWeight: '700',
    color: '#000000',
  },
  project: {
    fontSize: 13,
    color: '#999999',
  },
});
