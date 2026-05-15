/**
 * Config management with persistent storage via .note file
 *
 * Load priority:
 *   1. .note file -- /MyStyle/SuperTask/supertask-config.note
 *   2. Bundled config.local.js -- build-time injection (dev only)
 *   3. Defaults
 *
 * Storage approach: JSON is stored as a text element (type 500) inside a
 * hidden .note file, using only SDK APIs (PluginFileAPI, PluginCommAPI,
 * FileUtils). No native modules needed -- pure JS build.
 *
 * Obfuscation: XOR + base64. Obfuscated values start with "xor1:" prefix.
 * Plain text values are accepted on load and obfuscated on next save.
 */

import {PluginFileAPI, PluginCommAPI, PluginNoteAPI, FileUtils} from 'sn-plugin-lib';
import {log} from './debug';

// Bundled config (build-time, gitignored)
let bundledConfig = {};
try {
  const localConfig = require('../../config.local');
  bundledConfig = localConfig.default || localConfig;
} catch {
  // No config.local.js -- normal in production
}

const DEFAULT_CONFIG = {
  apiToken: '',
  debugServerUrl: '',
  defaultProjectId: null,
  defaultPriority: 1,
  enabledProjectIds: [],
  defaultTab: 'today',
  postCreateAction: 'prompt',
  defaultScreen: 'task-home',
  debugMode: false,
  markAsTextFontSize: 32,
  markAsTextLink: false,
};

// Fields that get obfuscated on disk
const SENSITIVE_KEYS = ['apiToken', 'debugServerUrl'];

const CONFIG_DIR = '/MyStyle/SuperTask';
const CONFIG_NOTE = CONFIG_DIR + '/supertask-config.note';
const CONFIG_PREFIX = 'ST_CFG:';

// Obfuscation key -- embedded in Hermes bytecode, not trivially readable
const OBF_KEY = 'sntask_v1_8f3a2c9d7e1b';
const OBF_PREFIX = 'xor1:';

// In-memory cache (always holds decoded values)
let _runtimeConfig = null;
let _configSource = 'defaults'; // 'file' | 'bundled' | 'defaults'

/**
 * Check if a string is an obfuscated value
 */
function isObfuscated(value) {
  return typeof value === 'string' && value.startsWith(OBF_PREFIX);
}

/**
 * XOR a string against the key, return base64-encoded result.
 * Uses btoa/atob (available in Hermes since RN 0.70+).
 */
function xorEncode(str) {
  const chars = [];
  for (let i = 0; i < str.length; i++) {
    chars.push(str.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
  }
  return btoa(String.fromCharCode(...chars));
}

/**
 * Decode a base64+XOR obfuscated string
 */
function xorDecode(encoded) {
  const bytes = atob(encoded);
  const chars = [];
  for (let i = 0; i < bytes.length; i++) {
    chars.push(bytes.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
  }
  return String.fromCharCode(...chars);
}

/**
 * Obfuscate a string value
 */
function obfuscate(value) {
  if (!value) return value;
  return OBF_PREFIX + xorEncode(value);
}

/**
 * Deobfuscate a string value. Returns original if not obfuscated.
 */
function deobfuscate(value) {
  if (!value || !isObfuscated(value)) return value;
  try {
    return xorDecode(value.slice(OBF_PREFIX.length));
  } catch {
    return value;
  }
}

/**
 * Deobfuscate sensitive fields in a config object (for loading)
 */
function deobfuscateConfig(config) {
  const result = {...config};
  for (const key of SENSITIVE_KEYS) {
    if (result[key]) {
      result[key] = deobfuscate(result[key]);
    }
  }
  return result;
}

/**
 * Obfuscate sensitive fields in a config object (for saving)
 */
function obfuscateConfig(config) {
  const result = {...config};
  for (const key of SENSITIVE_KEYS) {
    if (result[key] && !isObfuscated(result[key])) {
      result[key] = obfuscate(result[key]);
    }
  }
  return result;
}

/**
 * Ensure the config .note file exists. Creates it if missing.
 * Pattern from sn-keyworder: check getNoteTotalPageNum first,
 * only createNote if needed.
 */
async function ensureConfigNote() {
  try {
    // Ensure directory exists
    const dirExists = await FileUtils.exists(CONFIG_DIR);
    if (!dirExists) {
      await FileUtils.makeDir(CONFIG_DIR);
      log('Config', 'Created config directory');
    }

    // Check if note already exists (sn-keyworder pattern)
    const pageRes = await PluginFileAPI.getNoteTotalPageNum(CONFIG_NOTE);
    if (pageRes?.success && pageRes.result > 0) {
      return true;
    }

    // Create the storage note
    log('Config', 'Creating config .note file');
    const result = await PluginFileAPI.createNote({
      notePath: CONFIG_NOTE,
      template: 'none',
      mode: 0,
      isPortrait: true,
    });
    const ok = result?.success || result?.result === true;
    if (ok) {
      log('Config', 'Created config .note file');
      return true;
    }

    // Fallback: try with a system template name
    log('Config', `createNote template=none failed (${result?.error?.code}), trying system template`);
    const templatesResult = await PluginCommAPI.getNoteSystemTemplates();
    const templates = templatesResult?.result || [];
    if (templates.length > 0) {
      const t = templates[0];
      const templateName = typeof t === 'string' ? t : t?.name;
      if (templateName) {
        const fallback = await PluginFileAPI.createNote({
          notePath: CONFIG_NOTE,
          template: templateName,
          mode: 0,
          isPortrait: true,
        });
        const fbOk = fallback?.success || fallback?.result === true;
        if (fbOk) {
          log('Config', `Created config .note with system template: ${templateName}`);
          return true;
        }
        log('Config', `createNote fallback failed: ${JSON.stringify(fallback?.error)}`);
      }
    }

    return false;
  } catch (e) {
    log('Config', `ensureConfigNote error: ${e.message}`);
    return false;
  }
}

/**
 * Read config JSON from the .note file's text element
 */
async function loadFromFile() {
  try {
    const result = await PluginFileAPI.getElements(0, CONFIG_NOTE);
    if (!result?.success || !result.result) {
      log('Config', 'Config file not found');
      return null;
    }

    const elements = result.result;
    // Find the text element (type 500) containing our JSON
    const textEl = elements.find(el => el.type === 500 && el.textBox);
    if (!textEl) {
      log('Config', 'No text element in config note');
      for (const el of elements) {
        try { await el.recycle(); } catch {}
      }
      return null;
    }

    let json = textEl.textBox.textContentFull;
    // Recycle all elements
    for (const el of elements) {
      try { await el.recycle(); } catch {}
    }

    if (!json) {
      log('Config', 'Text element has no content');
      return null;
    }

    // Strip prefix if present (keyworder pattern uses a prefix)
    if (json.startsWith(CONFIG_PREFIX)) {
      json = json.slice(CONFIG_PREFIX.length);
    }

    const data = JSON.parse(json);
    if (data && typeof data === 'object') {
      const decoded = deobfuscateConfig(data);
      const hadObfuscated = SENSITIVE_KEYS.some(k => data[k] && isObfuscated(data[k]));
      log('Config', `Loaded from file (${Object.keys(data).length} keys, obfuscated=${hadObfuscated})`);
      return decoded;
    }
  } catch (e) {
    log('Config', `File read failed: ${e.message}`);
  }
  return null;
}

/**
 * Write config JSON to the .note file as a text element.
 * Follows sn-keyworder pattern: clearLayerElements + insertElements
 * with plain objects (no createElement needed).
 */
async function saveToFile(config) {
  try {
    const noteReady = await ensureConfigNote();
    if (!noteReady) {
      log('Config', 'Cannot save: config note not available');
      return false;
    }

    const encoded = obfuscateConfig(config);
    const dataStr = CONFIG_PREFIX + JSON.stringify(encoded);

    // Clear existing elements on page 0, layer 0
    await PluginFileAPI.clearLayerElements(CONFIG_NOTE, 0, 0);

    // Insert as plain object (sn-keyworder pattern -- no createElement needed)
    const insertResult = await PluginFileAPI.insertElements(CONFIG_NOTE, 0, [
      {
        type: 500,
        layerNum: 0,
        pageNum: 0,
        textBox: {
          textContentFull: dataStr,
          textRect: {left: 0, top: 0, right: 200, bottom: 40},
          fontSize: 10,
          textBold: 0,
          textItalics: 0,
          textAlign: 0,
          textEditable: 0,
        },
      },
    ]);

    if (!insertResult?.success) {
      log('Config', `insertElements failed: ${JSON.stringify(insertResult?.error)}`);
      return false;
    }

    // Persist to disk
    try { await PluginNoteAPI.saveCurrentNote(); } catch {}

    log('Config', `Saved to file (${dataStr.length} chars)`);
    return true;
  } catch (e) {
    log('Config', `File write failed: ${e.message}`);
    return false;
  }
}

/**
 * Load config with priority: file > bundled > defaults
 */
export async function loadConfig() {
  if (_runtimeConfig) {
    return {...DEFAULT_CONFIG, ...bundledConfig, ..._runtimeConfig};
  }

  const fileConfig = await loadFromFile();
  if (fileConfig) {
    _configSource = 'file';
    _runtimeConfig = fileConfig;
    return {...DEFAULT_CONFIG, ...bundledConfig, ...fileConfig};
  }

  if (bundledConfig.apiToken) {
    _configSource = 'bundled';
  }
  return {...DEFAULT_CONFIG, ...bundledConfig};
}

/**
 * Save config to runtime memory + persistent file
 */
export async function saveConfig(config) {
  _runtimeConfig = {..._runtimeConfig, ...config};

  const merged = {...DEFAULT_CONFIG, ...bundledConfig, ..._runtimeConfig};
  const saved = await saveToFile(merged);
  if (saved) {
    _configSource = 'file';
  }
  return saved;
}

/**
 * Get where the current config was loaded from
 */
export function getConfigSource() {
  return _configSource;
}

/**
 * Force reload from disk (ignores runtime cache)
 */
export async function reloadConfig() {
  _runtimeConfig = null;
  _configSource = 'defaults';
  return loadConfig();
}
