/**
 * Config management
 *
 * Loads config from two sources (in priority order):
 * 1. On-device config.json (written via plugin dir) -- for runtime changes
 * 2. Bundled config.local.js (baked into build) -- for the API token
 *
 * This avoids having to type a long API token on the e-ink keyboard.
 * Just paste it in config.local.js before building.
 */

import {PluginManager} from 'sn-plugin-lib';

// Bundled config (build-time, gitignored)
let bundledConfig = {};
try {
  bundledConfig = require('../../config.local').default;
} catch {
  // No config.local.js -- that's fine, user can enter token on-device
}

let pluginDir = null;

async function getPluginDir() {
  if (!pluginDir) {
    const res = await PluginManager.getPluginDirPath();
    if (res && res.result) {
      pluginDir = res.result;
    } else {
      throw new Error('Could not get plugin directory');
    }
  }
  return pluginDir;
}

async function readJsonFile(filename) {
  try {
    const dir = await getPluginDir();
    const path = `${dir}/${filename}`;
    const response = await fetch(`file://${path}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function writeJsonFile(filename, data) {
  const dir = await getPluginDir();
  const path = `${dir}/${filename}`;
  const {FileUtils} = require('sn-plugin-lib');
  const content = JSON.stringify(data, null, 2);
  await FileUtils.writeFile(path, content);
}

// Config

const DEFAULT_CONFIG = {
  apiToken: '',
  defaultProjectId: null,
  defaultPriority: 1,
};

export async function loadConfig() {
  // On-device config takes priority, then bundled, then defaults
  const saved = await readJsonFile('config.json');
  return {...DEFAULT_CONFIG, ...bundledConfig, ...saved};
}

export async function saveConfig(config) {
  await writeJsonFile('config.json', config);
}

// Project cache

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export async function loadProjectCache() {
  const cache = await readJsonFile('projects-cache.json');
  if (!cache) return null;

  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  if (age > CACHE_MAX_AGE_MS) return null;

  return cache.projects;
}

export async function saveProjectCache(projects) {
  await writeJsonFile('projects-cache.json', {
    projects,
    fetchedAt: new Date().toISOString(),
  });
}
