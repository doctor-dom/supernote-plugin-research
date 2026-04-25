/**
 * Debug logger -- collects log entries that can be displayed
 * in the plugin UI. On the Supernote there's no dev console,
 * so this is how we see what's happening.
 *
 * Includes export-to-file so logs can be retrieved via USB.
 */

import {PluginNoteAPI, PluginCommAPI, PluginFileAPI} from 'sn-plugin-lib';

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
 * Export debug log to the current note page as a text element.
 * This is a known-working write path (SmartGestures uses insertText).
 * The text will appear on the current note page and can be read/photographed.
 *
 * Also attempts to write to /EXPORT/ directory if FileUtils is available.
 */
export async function exportLog() {
  const logText = entries.join('\n') || '(no log entries)';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Method 1: Insert as text on the current note page (known-working)
  try {
    await PluginNoteAPI.insertText({
      textContentFull: `--- SuperTask Log ${timestamp} ---\n${logText}`,
      textRect: {left: 100, top: 100, right: 1400, bottom: 2000},
      fontSize: 14,
      textEditable: 1,
      textFrameStyle: 3,
      textAlign: 0,
      textBold: 0,
      textItalics: 0,
      textFrameWidthType: 0,
    });
    log('Export', 'Log inserted on note page');
    return 'Log inserted on current note page';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('Export', `insertText failed: ${msg}`);
    return `Export failed: ${msg}`;
  }
}
