/**
 * Debug logger -- collects log entries that can be displayed
 * in the plugin UI. On the Supernote there's no dev console,
 * so this is how we see what's happening.
 *
 * Export POSTs logs to a local dev server (node dev-server.js).
 * Falls back to inserting text on the current note page.
 */

import {PluginNoteAPI} from 'sn-plugin-lib';

// Load debug server URL from bundled config
let _debugServerUrl = '';
try {
  const cfg = require('../../config.local');
  _debugServerUrl = (cfg.default || cfg).debugServerUrl || '';
} catch {}

const MAX_ENTRIES = 50;
const entries = [];
let _listener = null;

export function log(tag, message) {
  const time = new Date().toLocaleTimeString();
  const entry = `[${time}] ${tag}: ${message}`;
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  if (_listener) _listener([...entries]);
}

export function logError(tag, err) {
  const msg = err instanceof Error
    ? `${err.message}\n${err.stack?.split('\n').slice(0, 3).join('\n')}`
    : String(err);
  log(tag, `ERROR ${msg}`);
}

export function getEntries() {
  return [...entries];
}

export function setListener(fn) {
  _listener = fn;
}

export function clearEntries() {
  entries.length = 0;
  if (_listener) _listener([]);
}

/**
 * Export debug log by POSTing to the local dev server.
 * Falls back to inserting text on the current note page.
 */
export async function exportLog() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logText = entries.length
    ? `--- SuperTask Log ${timestamp} ---\n\n${entries.join('\n')}`
    : '(no log entries)';

  // Method 1: POST to local dev server
  if (_debugServerUrl) {
    try {
      const resp = await fetch(_debugServerUrl, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: logText,
      });

      if (resp.ok) {
        return 'Log sent to dev server';
      }
      log('Export', `Dev server responded ${resp.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log('Export', `Dev server failed: ${msg}`);
    }
  }

  // Method 2: Insert as text on the current note page
  try {
    await PluginNoteAPI.insertText({
      textContentFull: logText,
      textRect: {left: 100, top: 100, right: 1400, bottom: 2000},
      fontSize: 14,
      textEditable: 1,
      textFrameStyle: 3,
      textAlign: 0,
      textBold: 0,
      textItalics: 0,
      textFrameWidthType: 0,
    });
    return 'Log inserted on note page (dev server unavailable)';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Export failed: ${msg}`;
  }
}
