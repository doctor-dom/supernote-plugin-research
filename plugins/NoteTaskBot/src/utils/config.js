/**
 * Config loader — Todoist API token from MyStyle JSON or bundled config.local.js
 */

import RNFS from 'react-native-fs';
import {log} from './debug';

let bundledConfig = {};
try {
  const localConfig = require('../../config.local');
  bundledConfig = localConfig.default || localConfig;
} catch {}

const CONFIG_DIR = '/storage/emulated/0/MyStyle/NoteTaskBot';
const CONFIG_FILE = CONFIG_DIR + '/notetaskbot-config.json';
const PLACEHOLDER_TOKEN = 'YOUR_TOKEN_HERE';
const DEFAULT_TARGET_PROJECT_ID = '6fVCFGxCf6MVJwm8';

let _runtimeConfig = null;

async function ensureTemplate() {
  try {
    if (await RNFS.exists(CONFIG_FILE)) return;
    const dirExists = await RNFS.exists(CONFIG_DIR);
    if (!dirExists) await RNFS.mkdir(CONFIG_DIR);
    const template = {
      apiToken: PLACEHOLDER_TOKEN,
      targetProjectId: DEFAULT_TARGET_PROJECT_ID,
    };
    await RNFS.writeFile(CONFIG_FILE, JSON.stringify(template, null, 2), 'utf8');
    log('Config', `Created template at ${CONFIG_FILE}`);
  } catch (e) {
    log('Config', `Template creation failed: ${e.message}`);
  }
}

export async function loadConfig() {
  if (_runtimeConfig) return _runtimeConfig;

  await ensureTemplate();

  try {
    if (await RNFS.exists(CONFIG_FILE)) {
      const raw = await RNFS.readFile(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.apiToken && parsed.apiToken !== PLACEHOLDER_TOKEN) {
        _runtimeConfig = {
          apiToken: parsed.apiToken.trim(),
          targetProjectId: parsed.targetProjectId?.trim() || DEFAULT_TARGET_PROJECT_ID,
        };
        log('Config', `Loaded config from MyStyle JSON (project=${_runtimeConfig.targetProjectId})`);
        return _runtimeConfig;
      }
    }
  } catch (e) {
    log('Config', `File load failed: ${e.message}`);
  }

  if (bundledConfig.apiToken) {
    _runtimeConfig = {
      apiToken: bundledConfig.apiToken,
      targetProjectId: bundledConfig.targetProjectId || DEFAULT_TARGET_PROJECT_ID,
    };
    log('Config', 'Loaded token from bundled config.local.js');
    return _runtimeConfig;
  }

  _runtimeConfig = {apiToken: '', targetProjectId: DEFAULT_TARGET_PROJECT_ID};
  log('Config', 'No API token configured');
  return _runtimeConfig;
}

export function clearConfigCache() {
  _runtimeConfig = null;
}
