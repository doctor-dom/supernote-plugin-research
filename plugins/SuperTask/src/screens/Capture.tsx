/**
 * Capture - OCR bridge for lasso/doc capture flows
 *
 * Runs recognition on mount, then navigates to TaskAdd with pre-filled content.
 * Shows on-screen diagnostics since dev server logs may not be reachable.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {PluginManager, PluginCommAPI, PluginFileAPI, PluginDocAPI} from 'sn-plugin-lib';
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

// Timeout wrapper -- SDK calls can hang forever on device
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export default function Capture({mode, nav}: Props) {
  // On-screen trace log for debugging without dev server
  const [trace, setTrace] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const addTrace = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setTrace(prev => [...prev, `[${ts}] ${msg}`]);
    log('Capture', msg);
  };

  useEffect(() => {
    addTrace(`MOUNT mode=${mode}`);
    setConfigLoader(loadConfig);
    loadConfig().then(config => {
      if (config.debugMode) setDebugMode(true);
    });
    runCapture();
  }, []);

  const runCapture = async () => {
    try {
      addTrace('Starting capture...');

      // Load config first (sync/fast)
      const config = await loadConfig();
      addTrace(`Config loaded, hasToken=${!!config.apiToken}`);

      // Run OCR
      const captureResult = mode === 'lasso' ? await captureLasso() : await captureDocText();

      if (!captureResult) {
        addTrace('Capture returned null (error already shown)');
        return;
      }

      // Fetch projects (non-blocking -- OK if it fails)
      addTrace('Fetching projects...');
      let projects: any[] = [];
      try {
        projects = await withTimeout(getProjects(), 8000, 'getProjects');
        addTrace(`Got ${projects?.length ?? 0} projects`);
      } catch (err: any) {
        addTrace(`Project fetch failed (non-fatal): ${err.message}`);
        projects = [];
      }

      addTrace('Navigating to TaskAdd...');
      setDone(true);
      nav.resetTo('task-add', {
        projects,
        defaultProjectId: config.defaultProjectId,
        initialContent: captureResult.content,
        initialDescription: captureResult.description,
        captureMode: mode,
        noteContext: captureResult.noteContext,
      });
    } catch (err: any) {
      logError('Capture', err);
      addTrace(`FATAL: ${err.message}`);
      setError(`Unexpected error: ${err.message}`);
    }
  };

  const captureLasso = async (): Promise<{content: string; description: string; noteContext?: any} | null> => {
    addTrace('captureLasso: calling getLassoElements...');

    try {
      const elements = await withTimeout(
        PluginCommAPI.getLassoElements(),
        10000,
        'getLassoElements',
      );
      addTrace(`getLassoElements: success=${elements?.success} count=${elements?.result?.length ?? 0}`);

      if (!elements?.success || !elements?.result?.length) {
        setError('No elements selected. Lasso some handwriting first.');
        addTrace('ERROR: no elements');
        return null;
      }

      // Get page context (needed for recognizeElements size param)
      addTrace('Getting file path and page number...');
      let filePath = '';
      let pageNum = 0;
      try {
        const fp = await withTimeout(PluginCommAPI.getCurrentFilePath(), 3000, 'getCurrentFilePath');
        filePath = fp?.result || '';
        addTrace(`filePath: ${filePath}`);
      } catch (e: any) {
        addTrace(`getCurrentFilePath failed: ${e.message}`);
      }
      try {
        const pn = await withTimeout(PluginCommAPI.getCurrentPageNum(), 3000, 'getCurrentPageNum');
        pageNum = pn?.result ?? 0;
        addTrace(`pageNum: ${pageNum}`);
      } catch (e: any) {
        addTrace(`getCurrentPageNum failed: ${e.message}`);
      }

      // Get page size -- required by recognizeElements
      let pageSize = {width: 1404, height: 1872}; // A5X default fallback
      if (filePath) {
        try {
          addTrace(`getPageSize(${filePath}, ${pageNum})...`);
          const ps = await withTimeout(
            PluginFileAPI.getPageSize(filePath, pageNum),
            5000,
            'getPageSize',
          );
          addTrace(`getPageSize result: ${JSON.stringify(ps)}`);
          if (ps?.result) {
            pageSize = ps.result;
          } else if (ps?.width && ps?.height) {
            pageSize = ps;
          }
        } catch (e: any) {
          addTrace(`getPageSize failed, using default: ${e.message}`);
        }
      }
      addTrace(`Using page size: ${pageSize.width}x${pageSize.height}`);

      addTrace(`recognizeElements: ${elements.result.length} elements, size=${pageSize.width}x${pageSize.height}...`);
      const recognized = await withTimeout(
        PluginCommAPI.recognizeElements(elements.result, pageSize),
        30000,
        'recognizeElements',
      );
      addTrace(`recognizeElements: success=${recognized?.success} text="${(recognized?.result || '').slice(0, 60)}"`);

      if (!recognized?.success || !recognized?.result) {
        setError('Could not recognize handwriting. Try selecting clearer text.');
        addTrace('ERROR: recognition failed');
        return null;
      }

      const content = recognized.result.trim();

      // Compute bounding box from lasso elements (EMR coords) then convert to pixels
      let bounds = null;
      try {
        let emrMinX = Infinity, emrMinY = Infinity, emrMaxX = 0, emrMaxY = 0;
        for (const el of elements.result) {
          if (el.maxX !== undefined && el.maxX > emrMaxX) emrMaxX = el.maxX;
          if (el.maxY !== undefined && el.maxY > emrMaxY) emrMaxY = el.maxY;
          // Check sub-objects for position data
          if (el.textBox?.textRect) {
            const r = el.textBox.textRect;
            if (r.left < emrMinX) emrMinX = r.left;
            if (r.top < emrMinY) emrMinY = r.top;
          }
          if (el.link) {
            if (el.link.X < emrMinX) emrMinX = el.link.X;
            if (el.link.Y < emrMinY) emrMinY = el.link.Y;
          }
          if (el.title) {
            if (el.title.X < emrMinX) emrMinX = el.title.X;
            if (el.title.Y < emrMinY) emrMinY = el.title.Y;
          }
        }
        addTrace(`EMR bounds: maxX=${emrMaxX} maxY=${emrMaxY} minX=${emrMinX === Infinity ? 'none' : emrMinX} minY=${emrMinY === Infinity ? 'none' : emrMinY}`);

        // Log first element structure for debugging
        const el0 = elements.result[0];
        addTrace(`Element[0] keys: ${Object.keys(el0).join(',')}`);
        addTrace(`Element[0] maxX=${el0.maxX} maxY=${el0.maxY} type=${el0.type}`);

        // Convert EMR coordinates to pixel coordinates
        // EMR X axis -> Android Y (direct scale)
        // EMR Y axis -> Android X (mirrored: width - 1 - scaled)
        const isA5X2 = pageSize.width >= 1920;
        const realMaxX = isA5X2 ? 21632 : 15819;
        const realMaxY = isA5X2 ? 16224 : 11864;
        const scaleX = realMaxX / (pageSize.height - 1); // EMR X per pixel Y
        const scaleY = realMaxY / (pageSize.width - 1);  // EMR Y per pixel X

        // Max EMR point -> pixel left (from maxY) and pixel bottom (from maxX)
        const pxLeft = Math.round(pageSize.width - 1 - emrMaxY / scaleY);
        const pxBottom = Math.round(emrMaxX / scaleX);

        let pxTop: number, pxRight: number;
        if (emrMinX !== Infinity && emrMinY !== Infinity) {
          // Have actual min values from sub-objects
          pxRight = Math.round(pageSize.width - 1 - emrMinY / scaleY);
          pxTop = Math.round(emrMinX / scaleX);
        } else {
          // Estimate: ~60px tall, width based on recognized text length
          const estWidth = Math.max(200, Math.min(800, (content?.length || 15) * 25));
          pxTop = Math.max(0, pxBottom - 60);
          pxRight = Math.min(pageSize.width - 1, pxLeft + estWidth);
        }

        bounds = {
          left: Math.min(pxLeft, pxRight),
          top: Math.min(pxTop, pxBottom),
          right: Math.max(pxLeft, pxRight),
          bottom: Math.max(pxTop, pxBottom),
        };
        addTrace(`Pixel bounds: l=${bounds.left} t=${bounds.top} r=${bounds.right} b=${bounds.bottom} (${isA5X2 ? 'A5X2' : 'A5X'})`);
      } catch (e: any) {
        addTrace(`Bounds calc failed: ${e.message}`);
      }

      // Build source context from filePath/pageNum we already fetched
      const fileName = filePath?.split('/').pop()?.replace('.note', '') || 'note';
      const description = `From: ${fileName} p.${pageNum}`;
      addTrace(`Done: "${content.slice(0, 40)}" -- ${description}`);

      const noteContext = bounds ? {filePath, pageNum, bounds, pageSize} : null;
      return {content, description, noteContext};
    } catch (err: any) {
      addTrace(`captureLasso ERROR: ${err.message}`);
      setError(`Recognition error: ${err.message}`);
      return null;
    }
  };

  const captureDocText = async (): Promise<{content: string; description: string} | null> => {
    addTrace('captureDocText: calling getLastSelectedText...');

    try {
      let text = '';

      try {
        const selected = await withTimeout(PluginDocAPI.getLastSelectedText(), 5000, 'getLastSelectedText');
        addTrace(`getLastSelectedText: success=${selected?.success}`);
        if (selected?.success && selected?.result) {
          text = selected.result;
        }
      } catch (e: any) {
        addTrace(`getLastSelectedText failed, trying fallback: ${e.message}`);
        try {
          const fallback = await withTimeout(PluginDocAPI.getSelectedText(), 5000, 'getSelectedText');
          if (fallback?.success && fallback?.result) {
            text = fallback.result;
          }
        } catch (e2: any) {
          addTrace(`getSelectedText fallback also failed: ${e2.message}`);
        }
      }

      if (!text) {
        setError('No text selected. Highlight some text in the document first.');
        return null;
      }

      const content = text.trim();
      let fileName = 'document';
      try {
        const filePath = await withTimeout(PluginCommAPI.getCurrentFilePath(), 3000, 'getCurrentFilePath');
        fileName = filePath?.result?.split('/').pop() || 'document';
      } catch (e: any) {
        addTrace(`getCurrentFilePath failed: ${e.message}`);
      }

      const description = `From: ${fileName}`;
      addTrace(`Done: "${content.slice(0, 40)}" -- ${description}`);
      return {content, description};
    } catch (err: any) {
      addTrace(`captureDocText ERROR: ${err.message}`);
      setError(`Capture error: ${err.message}`);
      return null;
    }
  };

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Capture Error</Text>
          <Pressable style={styles.headerBtn} onPress={() => PluginManager.closePluginView()}>
            <Text style={styles.headerBtnText}>Close</Text>
          </Pressable>
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.btn} onPress={() => {
            setError('');
            setTrace([]);
            runCapture();
          }}>
            <Text style={styles.btnText}>Retry</Text>
          </Pressable>
          {debugMode && (
            <Pressable style={styles.btn} onPress={() => nav.resetTo('debug')}>
              <Text style={styles.btnText}>Log</Text>
            </Pressable>
          )}
        </View>
        {debugMode && (
          <ScrollView style={styles.traceScroll}>
            <Text style={styles.traceTitle}>Trace:</Text>
            {trace.map((t, i) => (
              <Text key={i} style={styles.traceLine}>{t}</Text>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // Loading state -- shows on-screen trace when debug mode is on
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {mode === 'lasso' ? 'Recognizing...' : 'Reading text...'}
        </Text>
        <Pressable style={styles.headerBtn} onPress={() => PluginManager.closePluginView()}>
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>
      </View>
      {debugMode ? (
        <ScrollView style={styles.traceScroll}>
          {trace.map((t, i) => (
            <Text key={i} style={styles.traceLine}>{t}</Text>
          ))}
          {!done && <Text style={styles.traceLine}>...</Text>}
        </ScrollView>
      ) : (
        <View style={styles.traceScroll}>
          <Text style={styles.traceLine}>
            {done ? 'Done' : 'Processing...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  traceScroll: {
    flex: 1,
    padding: 12,
  },
  traceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  traceLine: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#000000',
    marginBottom: 4,
    lineHeight: 18,
  },
});
