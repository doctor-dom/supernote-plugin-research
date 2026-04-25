/**
 * Debug logger -- collects log entries that can be displayed
 * in the plugin UI. On the Supernote there's no dev console,
 * so this is how we see what's happening.
 */

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
