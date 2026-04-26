/**
 * SectionHeader - Group divider with title and count
 */

import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';

type Props = {
  title: string;
  count?: number;
  onPress?: () => void;
};

export default function SectionHeader({title, count, onPress}: Props) {
  const content = (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title.toUpperCase()}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
      {onPress ? <Text style={styles.arrow}>{'>'}</Text> : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  arrow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
