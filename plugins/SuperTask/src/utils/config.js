/**
 * Config management -- reads/writes config.json and projects-cache.json
 * from the plugin's persistent directory on the Supernote.
 */

import {PluginManager} from 'sn-plugin-lib';

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
  // Write JSON string to file
  const content = JSON.stringify(data, null, 2);
  // Use RN's filesystem or a simple write approach
  // For now, we use the fetch-based write pattern that works on Supernote
  const blob = new Blob([content], {type: 'application/json'});
  await FileUtils.writeFile(path, content);
}

// Config

const DEFAULT_CONFIG = {
  apiToken: '',
  defaultProjectId: null,
  defaultPriority: 1,
};

export async function loadConfig() {
  const saved = await readJsonFile('config.json');
  return {...DEFAULT_CONFIG, ...saved};
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
