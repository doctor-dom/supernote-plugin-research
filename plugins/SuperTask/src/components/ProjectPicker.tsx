/**
 * ProjectPicker - Toggle buttons for selecting a project
 */

import React from 'react';
import {View, Text, Pressable, StyleSheet, ScrollView} from 'react-native';
import {log} from '../utils/debug';

type Project = {
  id: string;
  name: string;
};

type Props = {
  projects: Project[];
  selectedId: string | null;
  onChange: (projectId: string | null) => void;
};

export default function ProjectPicker({projects, selectedId, onChange}: Props) {
  if (!projects.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.row}>
        {projects.map(p => (
          <Pressable
            key={p.id}
            style={[styles.button, selectedId === p.id && styles.selected]}
            onPress={() => { log('ProjectPicker', `pressed: ${p.name} (${p.id})`); onChange(selectedId === p.id ? null : p.id); }}>
            <Text style={[styles.text, selectedId === p.id && styles.textSelected]}>
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  selected: {
    backgroundColor: '#000000',
  },
  text: {
    fontSize: 14,
    color: '#000000',
  },
  textSelected: {
    color: '#ffffff',
  },
});
