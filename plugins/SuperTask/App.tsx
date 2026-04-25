/**
 * SuperTask - Root component
 *
 * Routes to the correct screen based on which button was tapped.
 * Includes error boundary and debug log viewer for on-device diagnostics.
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, Pressable, StyleSheet} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';

import TaskList from './src/screens/TaskList';
import Capture from './src/screens/Capture';
import Config from './src/screens/Config';
import {log, logError, getEntries, setListener, exportLog} from './src/utils/debug';

type Screen = 'tasks' | 'capture-lasso' | 'capture-doc' | 'config' | 'debug';

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('tasks');
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    setListener(setDebugLog);

    try {
      const buttonId = global.__superTaskButtonId;
      log('App', `Button ID: ${JSON.stringify(buttonId)}`);

      if (buttonId === 200) {
        setScreen('capture-lasso');
      } else if (buttonId === 300) {
        setScreen('capture-doc');
      } else if (buttonId === 'config') {
        setScreen('config');
      } else {
        setScreen('tasks');
      }
    } catch (err) {
      logError('App', err);
      setError(String(err));
    }
  }, []);

  const handleNavigate = (s: string) => {
    log('App', `Navigate to: ${s}`);
    setScreen(s as Screen);
  };

  // Show debug log on error or when navigated to
  if (error || screen === 'debug') {
    return (
      <View style={styles.container}>
        <View style={styles.debugHeader}>
          <Text style={styles.debugTitle}>
            {error ? 'Error' : 'Debug Log'}
          </Text>
          <View style={styles.debugButtons}>
            <Pressable
              style={styles.debugButton}
              onPress={async () => {
                setExportStatus('Exporting...');
                const result = await exportLog();
                setExportStatus(result);
              }}>
              <Text style={styles.debugButtonText}>Export</Text>
            </Pressable>
            <Pressable
              style={styles.debugButton}
              onPress={() => { setError(null); setScreen('tasks'); }}>
              <Text style={styles.debugButtonText}>Tasks</Text>
            </Pressable>
            <Pressable
              style={styles.debugButton}
              onPress={() => PluginManager.closePluginView()}>
              <Text style={styles.debugButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        {exportStatus ? (
          <Text style={styles.exportStatus}>{exportStatus}</Text>
        ) : null}
        <ScrollView style={styles.debugScroll}>
          {getEntries().map((entry, i) => (
            <Text key={i} style={styles.debugEntry}>{entry}</Text>
          ))}
          {getEntries().length === 0 && (
            <Text style={styles.debugEntry}>No log entries yet.</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {screen === 'tasks' && <TaskList onNavigate={handleNavigate} />}
      {screen === 'capture-lasso' && <Capture mode="lasso" onNavigate={handleNavigate} />}
      {screen === 'capture-doc' && <Capture mode="doc" onNavigate={handleNavigate} />}
      {screen === 'config' && <Config onNavigate={handleNavigate} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  debugTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  debugButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  debugButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  debugButtonText: {
    fontSize: 14,
    color: '#000000',
  },
  errorText: {
    padding: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    backgroundColor: '#f0f0f0',
  },
  debugScroll: {
    flex: 1,
    padding: 12,
  },
  debugEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#000000',
    marginBottom: 4,
    lineHeight: 16,
  },
  exportStatus: {
    padding: 8,
    fontSize: 13,
    color: '#000000',
    backgroundColor: '#e8e8e8',
    textAlign: 'center',
  },
});

export default App;
