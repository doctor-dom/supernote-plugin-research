/**
 * Config management with persistent storage
 *
 * Load priority:
 *   1. RNFS JSON file -- /storage/emulated/0/MyStyle/SuperTask/supertask-config.json
 *   2. Bundled config.local.js -- build-time injection (dev only)
 *   3. Defaults
 *
 * Save writes to the RNFS JSON file. User can seed it via USB with plain text
 * values; sensitive fields (apiToken, debugServerUrl) are encrypted on next Save.
 *
 * Encryption: AES-256 via crypto-js. Encrypted values start with "U2FsdGVkX1"
 * (CryptoJS signature). Plain text values are accepted on load and encrypted
 * on next save, so USB-seeded configs work seamlessly.
 */

import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';
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

// Fields that get encrypted on disk
const SENSITIVE_KEYS = ['apiToken', 'debugServerUrl'];

const CONFIG_DIR = '/storage/emulated/0/MyStyle/SuperTask';
const CONFIG_FILE = CONFIG_DIR + '/supertask-config.json';

// Encryption key -- embedded in Hermes bytecode, not trivially readable
const ENC_KEY = 'sntask_v1_8f3a2c9d7e1b';

// In-memory cache (always holds decrypted values)
let _runtimeConfig = null;
let _configSource = 'defaults'; // 'file' | 'bundled' | 'defaults'

/**
 * Check if a string is a CryptoJS encrypted value
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith('U2FsdGVkX1');
}

/**
 * Encrypt a string value
 */
function encrypt(value) {
  if (!value) return value;
  return CryptoJS.AES.encrypt(value, ENC_KEY).toString();
}

/**
 * Decrypt a string value. Returns original if not encrypted or decryption fails.
 */
function decrypt(value) {
  if (!value || !isEncrypted(value)) return value;
  try {
    const bytes = CryptoJS.AES.decrypt(value, ENC_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || value; // fallback to original if empty result
  } catch {
    return value;
  }
}

/**
 * Decrypt sensitive fields in a config object (for loading)
 */
function decryptConfig(config) {
  const result = {...config};
  for (const key of SENSITIVE_KEYS) {
    if (result[key]) {
      result[key] = decrypt(result[key]);
    }
  }
  return result;
}

/**
 * Encrypt sensitive fields in a config object (for saving)
 */
function encryptConfig(config) {
  const result = {...config};
  for (const key of SENSITIVE_KEYS) {
    if (result[key] && !isEncrypted(result[key])) {
      result[key] = encrypt(result[key]);
    }
  }
  return result;
}

/**
 * Read config from JSON file on device
 */
async function loadFromFile() {
  try {
    const exists = await RNFS.exists(CONFIG_FILE);
    if (!exists) {
      log('Config', 'Config file not found');
      return null;
    }
    const json = await RNFS.readFile(CONFIG_FILE, 'utf8');
    const data = JSON.parse(json);
    if (data && typeof data === 'object') {
      const decrypted = decryptConfig(data);
      const hadEncrypted = SENSITIVE_KEYS.some(k => data[k] && isEncrypted(data[k]));
      log('Config', `Loaded from file (${Object.keys(data).length} keys, encrypted=${hadEncrypted})`);
      return decrypted;
    }
  } catch (e) {
    log('Config', `File read failed: ${e.message}`);
  }
  return null;
}

/**
 * Write config to JSON file on device (encrypts sensitive fields)
 */
async function saveToFile(config) {
  try {
    const dirExists = await RNFS.exists(CONFIG_DIR);
    if (!dirExists) {
      await RNFS.mkdir(CONFIG_DIR);
      log('Config', 'Created config directory');
    }

    const encrypted = encryptConfig(config);
    const json = JSON.stringify(encrypted, null, 2);
    await RNFS.writeFile(CONFIG_FILE, json, 'utf8');
    log('Config', `Saved to file (${json.length} chars, sensitive fields encrypted)`);
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
