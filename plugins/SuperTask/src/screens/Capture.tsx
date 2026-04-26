/**
 * Capture - OCR bridge for lasso/doc capture flows
 *
 * Runs recognition on mount, then navigates to TaskAdd with pre-filled content.
 * This is a transient screen -- it shows a loading state while OCR runs,
 * then pushes TaskAdd and never returns here.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {PluginManager, PluginCommAPI, PluginDocAPI} from 'sn-plugin-lib';
import {loadConfig} from '../utils/config';
import {setConfigLoader, getProjects} from '../api/todoist';
import {log, logError} from '../utils/debug';

type Nav = {
  push: (name: string, params?: Record<string, any>) => void;
  pop: () => void;
  resetTo: (name: string, params?: Record<string, any>) => void;
  canGoBack: boolean;
};

type Props = {
  mode: 'lasso' | 'doc';
  nav: Nav;
};

export default function Capture({mode, nav}: Props) {
  const [status, setStatus] = useState(
    mode === 'lasso' ? 'Recognizing handwriting...' : 'Reading selected text...',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    log('Capture', `MOUNT mode=${mode}`);
    setConfigLoader(loadConfig);
    runCapture();
  }, []);

  const runCapture = async () => {
    try {
      // Run OCR/text extraction and project fetch in parallel
      const [captureResult, projects, config] = await Promise.all([
        mode === 'lasso' ? captureLasso() : captureDocText(),
        fetchProjects(),
        loadConfig(),
      ]);

      if (!captureResult) {
        // Error already set by capture functions
        return;
      }

      log('Capture', `Success: content="${captureResult.content.slice(0, 50)}" description="${captureResult.description}"`);

      // Navigate to TaskAdd with pre-filled data
      nav.resetTo('task-add', {
        projects: projects || [],
        defaultProjectId: config.defaultProjectId,
        initialContent: captureResult.content,
        initialDescription: captureResult.description,
        captureMode: mode,
      });
    } catch (err: any) {
      logError('Capture', err);
      setError(`Unexpected error: ${err.message}`);
      setStatus('');
    }
  };

  const fetchProjects = async () => {
    try {
      const fetched = await getProjects();
      log('Capture', `Fetched ${fetched?.length ?? 0} projects`);
      return fetched || [];
    } catch (err: any) {
      logError('Capture', `Project fetch failed (non-fatal): ${err.message}`);
      return [];
    }
  };

  const captureLasso = async (): Promise<{content: string; description: string} | null> => {
    log('Capture', 'Starting lasso OCR...');

    try {
      log('Capture', 'Calling getLassoElements...');
      const elements = await PluginCommAPI.getLassoElements();
      log('Capture', `getLassoElements result: success=${elements?.success} count=${elements?.result?.length ?? 0}`);

      if (!elements?.success || !elements?.result?.length) {
        setError('No elements selected. Lasso some handwriting first.');
        setStatus('');
        return null;
      }

      log('Capture', `Calling recognizeElements with ${elements.result.length} elements...`);
      const recognized = await PluginCommAPI.recognizeElements(elements.result);
      log('Capture', `recognizeElements result: success=${recognized?.success} text="${(recognized?.result || '').slice(0, 80)}"`);

      if (!recognized?.success || !recognized?.result) {
        setError('Could not recognize handwriting. Try selecting clearer text.');
        setStatus('');
        return null;
      }

      const content = recognized.result.trim();

      // Get source context
      log('Capture', 'Getting source context...');
      const [filePath, pageNum] = await Promise.all([
        PluginCommAPI.getCurrentFilePath().catch((e: any) => {
          log('Capture', `getCurrentFilePath failed: ${e.message}`);
          return {result: ''};
        }),
        PluginCommAPI.getCurrentPageNum().catch((e: any) => {
          log('Capture', `getCurrentPageNum failed: ${e.message}`);
          return {result: '?'};
        }),
      ]);

      const fileName = filePath?.result?.split('/').pop()?.replace('.note', '') || 'note';
      const page = pageNum?.result ?? '?';
      const description = `From: ${fileName} p.${page}`;
      log('Capture', `Source context: ${description}`);

      return {content, description};
    } catch (err: any) {
      logError('Capture', err);
      setError(`Recognition error: ${err.message}`);
      setStatus('');
      return null;
    }
  };

  const captureDocText = async (): Promise<{content: string; description: string} | null> => {
    log('Capture', 'Starting doc text capture...');

    try {
      let text = '';

      log('Capture', 'Calling getLastSelectedText...');
      try {
        const selected = await PluginDocAPI.getLastSelectedText();
        log('Capture', `getLastSelectedText result: success=${selected?.success} text="${(selected?.result || '').slice(0, 80)}"`);
        if (selected?.success && selected?.result) {
          text = selected.result;
        }
      } catch (e: any) {
        log('Capture', `getLastSelectedText failed, trying fallback: ${e.message}`);
        try {
          const fallback = await PluginDocAPI.getSelectedText();
          log('Capture', `getSelectedText fallback result: success=${fallback?.success}`);
          if (fallback?.success && fallback?.result) {
            text = fallback.result;
          }
        } catch (e2: any) {
          log('Capture', `getSelectedText fallback also failed: ${e2.message}`);
        }
      }

      if (!text) {
        setError('No text selected. Highlight some text in the document first.');
        setStatus('');
        return null;
      }

      const content = text.trim();

      // Get source context
      log('Capture', 'Getting source context...');
      const filePath = await PluginCommAPI.getCurrentFilePath().catch((e: any) => {
        log('Capture', `getCurrentFilePath failed: ${e.message}`);
        return {result: ''};
      });

      const fileName = filePath?.result?.split('/').pop() || 'document';
      const description = `From: ${fileName}`;
      log('Capture', `Source context: ${description}`);

      return {content, description};
    } catch (err: any) {
      logError('Capture', err);
      setError(`Capture error: ${err.message}`);
      setStatus('');
      return null;
    }
  };

  // Error state -- show message with retry and close
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorButtons}>
            <Pressable style={styles.button} onPress={() => {
              log('Capture', 'RETRY pressed');
              setError('');
              setStatus(mode === 'lasso' ? 'Recognizing handwriting...' : 'Reading selected text...');
              runCapture();
            }}>
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => {
              log('Capture', 'CLOSE pressed');
              PluginManager.closePluginView();
            }}>
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => {
              log('Capture', 'LOG pressed from error');
              nav.resetTo('debug');
            }}>
              <Text style={styles.buttonText}>Log</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Loading state
  return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#000000',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
