/**
 * SuperTask - Root component
 *
 * Stack-based navigation for drill-down flows.
 * Capture/config/debug screens stay outside the stack.
 *
 * @format
 */

import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, Pressable, StyleSheet} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';

import TaskHome from './src/screens/TaskHome';
import ProjectView from './src/screens/ProjectView';
import TaskDetail from './src/screens/TaskDetail';
import TaskAdd from './src/screens/TaskAdd';
import Capture from './src/screens/Capture';
import Config from './src/screens/Config';
import {log, logError, getEntries, setListener, exportLog} from './src/utils/debug';

type ScreenEntry = {
  name: string;
  params?: Record<string, any>;
};

function App(): React.JSX.Element {
  const [screenStack, setScreenStack] = useState<ScreenEntry[]>([{name: 'task-home'}]);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    setListener(setDebugLog);

    try {
      const buttonId = global.__superTaskButtonId;
      log('App', `Button ID: ${JSON.stringify(buttonId)}`);

      if (buttonId === 200) {
        setScreenStack([{name: 'capture-lasso'}]);
      } else if (buttonId === 300) {
        setScreenStack([{name: 'capture-doc'}]);
      } else if (buttonId === 'config') {
        setScreenStack([{name: 'config'}]);
      } else {
        setScreenStack([{name: 'task-home'}]);
      }
    } catch (err) {
      logError('App', err);
      setError(String(err));
    }
  }, []);

  const push = useCallback((name: string, params?: Record<string, any>) => {
    log('App', `push: ${name} ${params ? JSON.stringify(params) : ''}`);
    setScreenStack(prev => [...prev, {name, params}]);
  }, []);

  const pop = useCallback(() => {
    setScreenStack(prev => {
      if (prev.length <= 1) return prev;
      log('App', `pop: back to ${prev[prev.length - 2].name}`);
      return prev.slice(0, -1);
    });
  }, []);

  const resetTo = useCallback((name: string, params?: Record<string, any>) => {
    log('App', `resetTo: ${name}`);
    setScreenStack([{name, params}]);
  }, []);

  const current = screenStack[screenStack.length - 1];
  const canGoBack = screenStack.length > 1;

  // Show debug log on error or when navigated to
  if (error || current.name === 'debug') {
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
                setExportStatus('Uploading...');
                const result = await exportLog();
                setExportStatus(result);
              }}>
              <Text style={styles.debugButtonText}>Upload Log</Text>
            </Pressable>
            <Pressable
              style={styles.debugButton}
              onPress={() => { setError(null); resetTo('task-home'); }}>
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

  const nav = {push, pop, resetTo, canGoBack};

  log('App', `RENDER screen="${current.name}" stackDepth=${screenStack.length} params=${current.params ? Object.keys(current.params).join(',') : 'none'}`);

  return (
    <View style={styles.container}>
      {current.name === 'task-home' && (
        <TaskHome nav={nav} />
      )}
      {current.name === 'project-view' && (
        <ProjectView nav={nav} projectId={current.params?.projectId} projectName={current.params?.projectName} />
      )}
      {current.name === 'task-detail' && (
        <TaskDetail nav={nav} task={current.params?.task} projects={current.params?.projects} />
      )}
      {current.name === 'task-add' && (
        <TaskAdd nav={nav} projects={current.params?.projects} defaultProjectId={current.params?.defaultProjectId} />
      )}
      {current.name === 'capture-lasso' && (
        <Capture mode="lasso" onNavigate={(s: string) => resetTo(s)} />
      )}
      {current.name === 'capture-doc' && (
        <Capture mode="doc" onNavigate={(s: string) => resetTo(s)} />
      )}
      {current.name === 'config' && (
        <Config onNavigate={(s: string) => resetTo(s)} />
      )}
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
