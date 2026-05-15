/**
 * Config management with persistent storage
 *
 * Load priority:
 *   1. MyStyle JSON -- file:///storage/emulated/0/MyStyle/SuperTask/supertask-config.json
 *   2. Storage note -- hidden .note file with config serialized as a text element
 *   3. Bundled config.local.js -- build-time injection (dev only)
 *   4. Defaults
 *
 * Save writes to the storage note. MyStyle JSON is read-only (user edits via USB).
 */

import {PluginFileAPI, FileUtils} from 'sn-plugin-lib';
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

const MYSTYLE_CONFIG_PATH = 'file:///storage/emulated/0/MyStyle/SuperTask/supertask-config.json';
const STORAGE_DIR = '/MyStyle/SuperTask';
const STORAGE_NOTE = '/MyStyle/SuperTask/supertask-storage.note';
const STORAGE_PREFIX = 'SUPERTASK_CONFIG:';

// In-memory cache
let _runtimeConfig = null;
let _configSource = 'defaults'; // 'mystyle' | 'storage' | 'bundled' | 'defaults'

/**
 * Read config from MyStyle JSON file (user-provided via USB)
 */
async function loadFromMyStyle() {
  try {
    log('Config', `Trying MyStyle JSON: ${MYSTYLE_CONFIG_PATH}`);
    const response = await fetch(MYSTYLE_CONFIG_PATH);
    log('Config', `MyStyle fetch status: ${response.status} ok: ${response.ok}`);
    const data = await response.json();
    if (data && typeof data === 'object') {
      log('Config', `Loaded from MyStyle JSON (${Object.keys(data).length} keys)`);
      return data;
    }
  } catch (e) {
    log('Config', `MyStyle JSON not found or invalid: ${e.message}`);
  }
  return null;
}

/**
 * Read config from hidden storage note
 */
async function loadFromStorage() {
  try {
    const exists = await FileUtils.exists(STORAGE_NOTE);
    if (!exists) return null;

    const pageCount = await PluginFileAPI.getNoteTotalPageNum(STORAGE_NOTE);
    if (!pageCount?.success || !pageCount.result || pageCount.result < 1) return null;

    const elements = await PluginFileAPI.getElements(0, STORAGE_NOTE);
    if (!elements?.success || !elements.result) return null;

    for (const el of elements.result) {
      const text = el.textBox?.textContentFull || '';
      if (text.startsWith(STORAGE_PREFIX)) {
        const json = text.slice(STORAGE_PREFIX.length);
        const data = JSON.parse(json);
        log('Config', `Loaded from storage note (${Object.keys(data).length} keys)`);
        return data;
      }
    }
  } catch (e) {
    log('Config', `Storage note read failed: ${e.message}`);
  }
  return null;
}

/**
 * Write config to hidden storage note
 */
async function saveToStorage(config) {
  try {
    // Step 1: Ensure directory exists
    try {
      const dirExists = await FileUtils.exists(STORAGE_DIR);
      log('Config', `Storage dir exists: ${dirExists}`);
      if (!dirExists) {
        const mkResult = await FileUtils.makeDir(STORAGE_DIR);
        log('Config', `makeDir result: ${JSON.stringify(mkResult)}`);
      }
    } catch (e) {
      log('Config', `Dir create failed: ${e.message}`);
    }

    // Step 2: Ensure storage note exists
    let noteExists = false;
    try {
      const pageCount = await PluginFileAPI.getNoteTotalPageNum(STORAGE_NOTE);
      log('Config', `Storage note pageCount: ${JSON.stringify(pageCount)}`);
      noteExists = pageCount?.success && pageCount.result > 0;
    } catch (e) {
      log('Config', `Storage note check failed: ${e.message}`);
    }

    if (!noteExists) {
      log('Config', `Creating storage note at: ${STORAGE_NOTE}`);
      try {
        const createResult = await PluginFileAPI.createNote({
          notePath: STORAGE_NOTE,
          template: 'none',
          mode: 0,
          isPortrait: true,
        });
        log('Config', `createNote result: ${JSON.stringify(createResult)}`);
        if (!createResult?.success) {
          log('Config', `createNote failed, cannot persist config`);
          return false;
        }
      } catch (e) {
        log('Config', `createNote error: ${e.message}`);
        return false;
      }
    }

    // Step 3: Clear existing elements
    try {
      const clearResult = await PluginFileAPI.clearLayerElements(STORAGE_NOTE, 0, 0);
      log('Config', `clearLayerElements result: ${JSON.stringify(clearResult)}`);
    } catch (e) {
      log('Config', `clearLayerElements failed (ok if empty): ${e.message}`);
    }

    // Step 4: Write config as text element
    const dataStr = STORAGE_PREFIX + JSON.stringify(config);
    log('Config', `Writing config (${dataStr.length} chars) to storage note`);
    const insertResult = await PluginFileAPI.insertElements(STORAGE_NOTE, 0, [
      {
        type: 500,
        layerNum: 0,
        pageNum: 0,
        textBox: {
          textContentFull: dataStr,
          textRect: {left: 0, top: 0, right: 100, bottom: 20},
          fontSize: 8,
          textBold: 0,
          textItalics: 0,
          textAlign: 0,
          textEditable: 0,
        },
      },
    ]);

    if (insertResult?.success) {
      log('Config', 'Config saved to storage note');
      return true;
    } else {
      log('Config', `insertElements failed: ${JSON.stringify(insertResult)}`);
      return false;
    }
  } catch (e) {
    log('Config', `saveToStorage error: ${e.message}`);
    return false;
  }
}

/**
 * Load config with priority: MyStyle > storage note > bundled > defaults
 */
export async function loadConfig() {
  if (_runtimeConfig) {
    return {...DEFAULT_CONFIG, ...bundledConfig, ..._runtimeConfig};
  }

  // Try MyStyle JSON first
  const myStyleConfig = await loadFromMyStyle();
  if (myStyleConfig) {
    _configSource = 'mystyle';
    _runtimeConfig = myStyleConfig;
    return {...DEFAULT_CONFIG, ...bundledConfig, ...myStyleConfig};
  }

  // Try storage note
  const storageConfig = await loadFromStorage();
  if (storageConfig) {
    _configSource = 'storage';
    _runtimeConfig = storageConfig;
    return {...DEFAULT_CONFIG, ...bundledConfig, ...storageConfig};
  }

  // Fall back to bundled config
  if (bundledConfig.apiToken) {
    _configSource = 'bundled';
  }
  return {...DEFAULT_CONFIG, ...bundledConfig};
}

/**
 * Save config to runtime memory + persistent storage note
 */
export async function saveConfig(config) {
  _runtimeConfig = {..._runtimeConfig, ...config};

  // Persist to storage note on device
  const saved = await saveToStorage({...DEFAULT_CONFIG, ...bundledConfig, ..._runtimeConfig});
  if (saved) {
    _configSource = 'storage';
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
