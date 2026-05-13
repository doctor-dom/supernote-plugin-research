/**
 * Diagnostics - Test SDK APIs needed for dashboard feature
 *
 * Runs each API call with timeouts and logs success/failure.
 * Results shown on screen and sent to dev log server.
 */

import React, {useState} from 'react';
import {View, Text, Pressable, StyleSheet, ScrollView} from 'react-native';
import {
  PluginCommAPI,
  PluginNoteAPI,
  PluginFileAPI,
  FileUtils,
} from 'sn-plugin-lib';
import {log} from '../utils/debug';

type Props = {
  nav: {pop: () => void};
};

type TestResult = {
  name: string;
  status: 'pending' | 'pass' | 'fail' | 'running';
  detail: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export default function Diagnostics({nav}: Props) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  // Store templates from test 1 for use in tests 2 and 4
  const templatesRef = React.useRef<any[]>([]);

  const update = (name: string, status: TestResult['status'], detail: string) => {
    log('Diag', `${name}: ${status} -- ${detail}`);
    setResults(prev => {
      const idx = prev.findIndex(r => r.name === name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {name, status, detail};
        return copy;
      }
      return [...prev, {name, status, detail}];
    });
  };

  const runAll = async () => {
    setRunning(true);
    setResults([]);
    templatesRef.current = [];
    log('Diag', '=== Starting diagnostic run ===');

    // Get a valid absolute base path for file operations
    let basePath = '';
    try {
      const exportPath = await withTimeout(FileUtils.getExportPath(), 5000, 'getExportPath');
      // exportPath is like /storage/emulated/0/EXPORT -- derive /storage/emulated/0/
      if (exportPath) {
        basePath = exportPath.replace(/EXPORT\/?$/, '');
      }
      update('basePath', 'pass', basePath || '(empty)');
    } catch (e: any) {
      update('basePath', 'fail', e.message);
    }

    // Get current note context (may timeout if no note is active)
    let filePath = '';
    let pageNum = 0;
    try {
      const fp = await withTimeout(PluginCommAPI.getCurrentFilePath(), 5000, 'getCurrentFilePath');
      filePath = fp?.result || '';
      const pn = await withTimeout(PluginCommAPI.getCurrentPageNum(), 5000, 'getCurrentPageNum');
      pageNum = pn?.result ?? 0;
      update('noteContext', 'pass', `file=${filePath} page=${pageNum}`);
    } catch (e: any) {
      update('noteContext', 'fail', `No active note: ${e.message}`);
    }

    // --- Context-free tests ---

    // 1. getNoteSystemTemplates
    await testGetTemplates();

    // 2. createNote (uses template from test 1 + proper absolute path)
    await testCreateNote(basePath);

    // --- Context-dependent tests (need active note) ---

    // 3. insertTextLink (operates on current note page)
    await testInsertTextLink(filePath);

    // 4. insertNotePage
    await testInsertNotePage(filePath);

    // 5. replaceElements roundtrip
    await testReplaceElements(filePath, pageNum);

    // openFilePath skipped -- it ejects from the note to file manager

    log('Diag', '=== Diagnostic run complete ===');
    setRunning(false);
  };

  const testGetTemplates = async () => {
    const name = 'getNoteSystemTemplates';
    update(name, 'running', '');
    try {
      const result = await withTimeout(
        PluginCommAPI.getNoteSystemTemplates(),
        8000,
        name,
      );
      const templates = Array.isArray(result) ? result : [];
      templatesRef.current = templates;
      const summary = templates.length > 0
        ? templates.slice(0, 3).map((t: any) => typeof t === 'string' ? t : JSON.stringify(t)).join(', ')
        : 'empty';
      update(name, 'pass', `${templates.length} templates: ${summary}`);
    } catch (e: any) {
      update(name, 'fail', e.message);
    }
  };

  const testCreateNote = async (basePath: string) => {
    const name = 'createNote';
    update(name, 'running', '');

    const templates = templatesRef.current;
    if (templates.length === 0) {
      update(name, 'fail', 'No templates (getNoteSystemTemplates must run first)');
      return;
    }

    // Try each template format: name, hUri, vUri
    const t = templates[0];
    const templateName = typeof t === 'string' ? t : t?.name;
    const templateHUri = t?.hUri;
    const templateVUri = t?.vUri;
    const testPath = basePath ? `${basePath}Note/_supertask_diag.note` : '/storage/emulated/0/Note/_supertask_diag.note';

    // Try with template name first (docs say pass Template.name)
    const attempts = [
      {label: 'name', value: templateName},
      {label: 'vUri', value: templateVUri},
      {label: 'hUri', value: templateHUri},
    ].filter(a => a.value);

    const errors: string[] = [];
    for (const attempt of attempts) {
      try {
        log('Diag', `createNote: path=${testPath} template[${attempt.label}]=${attempt.value}`);
        const result = await withTimeout(
          PluginFileAPI.createNote({
            notePath: testPath,
            template: attempt.value,
            mode: 0,
            isPortrait: true,
          }),
          10000,
          `createNote(${attempt.label})`,
        );
        const json = JSON.stringify(result);
        const ok = result?.success || result?.result === true;

        if (ok) {
          update(name, 'pass', `template=${attempt.label}:${attempt.value} path=${testPath}`);
          try { await FileUtils.deleteFile(testPath); } catch {}
          return;
        }

        const errMsg = `${attempt.label}: ${result?.error?.message || json} (code ${result?.error?.code || '?'})`;
        errors.push(errMsg);
        log('Diag', `createNote ${attempt.label} failed: ${json}`);
      } catch (e: any) {
        errors.push(`${attempt.label}: ${e.message}`);
        log('Diag', `createNote ${attempt.label} error: ${e.message}`);
      }
    }

    update(name, 'fail', `path=${testPath}\n${errors.join('\n')}`);
  };

  const testInsertTextLink = async (filePath: string) => {
    const name = 'insertTextLink';
    update(name, 'running', '');
    if (!filePath) {
      update(name, 'fail', 'Needs active note context (open note, lasso, then run diag)');
      return;
    }
    try {
      const result = await withTimeout(
        PluginNoteAPI.insertTextLink({
          destPath: 'https://todoist.com',
          destPage: 0,
          style: 2,
          linkType: 4,
          rect: {left: 100, top: 100, right: 400, bottom: 140},
          fontSize: 16,
          fullText: 'SuperTask Dashboard',
          showText: 'SuperTask Dashboard',
          isItalic: 0,
        }),
        8000,
        name,
      );
      const json = JSON.stringify(result);
      const ok = result?.success || result?.result === 0;
      update(name, ok ? 'pass' : 'fail', json);
    } catch (e: any) {
      update(name, 'fail', e.message);
    }
  };

  const testInsertNotePage = async (filePath: string) => {
    const name = 'insertNotePage';
    update(name, 'running', '');
    if (!filePath) {
      update(name, 'fail', 'Needs active note context');
      return;
    }

    const templates = templatesRef.current;
    if (templates.length === 0) {
      update(name, 'fail', 'No templates available');
      return;
    }

    const t = templates[0];
    const templateName = typeof t === 'string' ? t : t?.name;

    try {
      const totalRes = await withTimeout(
        PluginFileAPI.getNoteTotalPageNum(filePath),
        5000,
        'getNoteTotalPageNum',
      );
      const total = totalRes?.result ?? 1;

      log('Diag', `insertNotePage: path=${filePath} page=${total} template=${templateName}`);
      const result = await withTimeout(
        PluginFileAPI.insertNotePage({
          notePath: filePath,
          page: total,
          template: templateName,
        }),
        10000,
        name,
      );
      const json = JSON.stringify(result);
      const ok = result?.success || result?.result === true;
      update(name, ok ? 'pass' : 'fail', `page=${total} template=${templateName} ${json}`);

      if (ok) {
        try {
          await withTimeout(PluginFileAPI.removeNotePage(filePath, total), 5000, 'removeNotePage');
        } catch {}
      }
    } catch (e: any) {
      update(name, 'fail', e.message);
    }
  };

  const testOpenFilePath = async (basePath: string) => {
    const name = 'openFilePath';
    update(name, 'running', '');
    try {
      const dir = basePath ? `${basePath}Note/` : '/storage/emulated/0/Note/';
      log('Diag', `openFilePath: ${dir}`);
      const result = await withTimeout(
        FileUtils.openFilePath(dir),
        8000,
        name,
      );
      update(name, result ? 'pass' : 'fail', `result=${result} path=${dir}`);
    } catch (e: any) {
      update(name, 'fail', e.message);
    }
  };

  const testReplaceElements = async (currentPath: string, page: number) => {
    const name = 'replaceElements';
    update(name, 'running', '');
    if (!currentPath) {
      update(name, 'fail', 'No current file path');
      return;
    }
    try {
      await withTimeout(PluginNoteAPI.saveCurrentNote(), 5000, 'saveCurrentNote');

      const getResult = await withTimeout(
        PluginFileAPI.getElements(page, currentPath),
        8000,
        'getElements',
      );
      if (!getResult?.success) {
        update(name, 'fail', `getElements: ${JSON.stringify(getResult)}`);
        return;
      }
      const elements = getResult.result || [];
      const count = Array.isArray(elements) ? elements.length : 0;

      const replaceResult = await withTimeout(
        PluginFileAPI.replaceElements(currentPath, page, Array.isArray(elements) ? elements : []),
        10000,
        'replaceElements',
      );
      const json = JSON.stringify(replaceResult);
      const ok = replaceResult?.success || replaceResult?.result === true;
      update(name, ok ? 'pass' : 'fail', `${count} els roundtripped. ${json}`);
    } catch (e: any) {
      update(name, 'fail', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.pop()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </Pressable>
        <Text style={styles.title}>API Diagnostics</Text>
        <View style={{width: 50}} />
      </View>

      <Pressable
        style={[styles.runButton, running && styles.buttonDisabled]}
        onPress={runAll}
        disabled={running}>
        <Text style={[styles.runText, running && styles.runTextDisabled]}>
          {running ? 'Running...' : 'Run All Tests'}
        </Text>
      </Pressable>

      <ScrollView style={styles.scroll}>
        {results.map((r, i) => (
          <View key={i} style={styles.resultRow}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>
                {r.status === 'pass' ? 'OK' : r.status === 'fail' ? 'FAIL' : r.status === 'running' ? '...' : '  '}
              </Text>
              <Text style={styles.resultName}>{r.name}</Text>
            </View>
            {r.detail ? (
              <Text style={styles.resultDetail}>{r.detail}</Text>
            ) : null}
          </View>
        ))}
        {results.length === 0 && !running && (
          <Text style={styles.hint}>
            Tap "Run All Tests" to probe SDK APIs for dashboard.{'\n'}
            Open a note first so file-context tests can run.
          </Text>
        )}
      </ScrollView>
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
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  runButton: {
    margin: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  buttonDisabled: {
    backgroundColor: '#ffffff',
    borderColor: '#cccccc',
  },
  runText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  runTextDisabled: {
    color: '#cccccc',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultIcon: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#000000',
    width: 36,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  resultDetail: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#000000',
    marginTop: 4,
    marginLeft: 44,
    lineHeight: 16,
  },
  hint: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    padding: 16,
  },
});
