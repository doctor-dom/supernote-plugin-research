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

let _runtimeConfig = null;

async function ensureTemplate() {
  try {
    if (await RNFS.exists(CONFIG_FILE)) return;
    const dirExists = await RNFS.exists(CONFIG_DIR);
    if (!dirExists) await RNFS.mkdir(CONFIG_DIR);
    const template = {apiToken: PLACEHOLDER_TOKEN};
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
        _runtimeConfig = {apiToken: parsed.apiToken.trim()};
        log('Config', 'Loaded token from MyStyle JSON');
        return _runtimeConfig;
      }
    }
  } catch (e) {
    log('Config', `File load failed: ${e.message}`);
  }

  if (bundledConfig.apiToken) {
    _runtimeConfig = {apiToken: bundledConfig.apiToken};
    log('Config', 'Loaded token from bundled config.local.js');
    return _runtimeConfig;
  }

  _runtimeConfig = {apiToken: ''};
  log('Config', 'No API token configured');
  return _runtimeConfig;
}

export function clearConfigCache() {
  _runtimeConfig = null;
}
