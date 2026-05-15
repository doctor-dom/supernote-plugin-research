/**
 * Task Registry -- local index of tasks created by SuperTask.
 *
 * Stores task metadata in RNFS JSON for fast page-level lookup
 * without hitting the Todoist API. Written on task creation,
 * read when SuperTask opens to show "tasks on this page."
 *
 * File: /MyStyle/SuperTask/task-registry.json
 */

import RNFS from 'react-native-fs';
import {log} from './debug';

const REGISTRY_DIR = '/storage/emulated/0/MyStyle/SuperTask';
const REGISTRY_FILE = REGISTRY_DIR + '/task-registry.json';

let _cache = null;

function emptyRegistry() {
  return {tasks: {}, lastSync: null};
}

async function read() {
  if (_cache) return _cache;
  try {
    const exists = await RNFS.exists(REGISTRY_FILE);
    if (!exists) {
      _cache = emptyRegistry();
      return _cache;
    }
    const raw = await RNFS.readFile(REGISTRY_FILE, 'utf8');
    _cache = JSON.parse(raw);
    log('Registry', `Loaded ${Object.keys(_cache.tasks).length} tasks`);
    return _cache;
  } catch (e) {
    log('Registry', `Read failed: ${e.message}`);
    _cache = emptyRegistry();
    return _cache;
  }
}

async function write(registry) {
  _cache = registry;
  try {
    const dirExists = await RNFS.exists(REGISTRY_DIR);
    if (!dirExists) {
      await RNFS.mkdir(REGISTRY_DIR);
    }
    await RNFS.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
  } catch (e) {
    log('Registry', `Write failed: ${e.message}`);
  }
}

/**
 * Add a task to the registry after creation.
 */
export async function addTask(taskId, {content, noteFile, pageNum, completed = false}) {
  const registry = await read();
  registry.tasks[taskId] = {
    content,
    noteFile,
    pageNum,
    createdAt: new Date().toISOString(),
    completed,
  };
  await write(registry);
  log('Registry', `Added task ${taskId}: "${content.slice(0, 30)}"`);
}

/**
 * Get all tasks for a specific note file and page number.
 */
export async function getTasksForPage(noteFile, pageNum) {
  const registry = await read();
  const results = [];
  for (const [id, task] of Object.entries(registry.tasks)) {
    if (task.noteFile === noteFile && task.pageNum === pageNum) {
      results.push({id, ...task});
    }
  }
  return results;
}

/**
 * Get all tasks for a specific note file (any page).
 */
export async function getTasksForNote(noteFile) {
  const registry = await read();
  const results = [];
  for (const [id, task] of Object.entries(registry.tasks)) {
    if (task.noteFile === noteFile) {
      results.push({id, ...task});
    }
  }
  return results;
}

/**
 * Mark a task as completed in the registry.
 */
export async function markCompleted(taskId) {
  const registry = await read();
  if (registry.tasks[taskId]) {
    registry.tasks[taskId].completed = true;
    await write(registry);
    log('Registry', `Marked completed: ${taskId}`);
  }
}

/**
 * Update a task's ID (e.g., after offline sync replaces local ID with Todoist ID).
 */
export async function updateTaskId(oldId, newId) {
  const registry = await read();
  if (registry.tasks[oldId]) {
    registry.tasks[newId] = registry.tasks[oldId];
    delete registry.tasks[oldId];
    await write(registry);
    log('Registry', `Updated ID: ${oldId} -> ${newId}`);
  }
}

/**
 * Get a single task by ID.
 */
export async function getTask(taskId) {
  const registry = await read();
  const task = registry.tasks[taskId];
  return task ? {id: taskId, ...task} : null;
}

/**
 * Get all tasks in the registry.
 */
export async function getAllTasks() {
  const registry = await read();
  return Object.entries(registry.tasks).map(([id, task]) => ({id, ...task}));
}

/**
 * Remove a task from the registry.
 */
export async function removeTask(taskId) {
  const registry = await read();
  if (registry.tasks[taskId]) {
    delete registry.tasks[taskId];
    await write(registry);
    log('Registry', `Removed task: ${taskId}`);
  }
}

/**
 * Update lastSync timestamp.
 */
export async function setLastSync() {
  const registry = await read();
  registry.lastSync = new Date().toISOString();
  await write(registry);
}

/**
 * Invalidate in-memory cache (force re-read from disk).
 */
export function invalidateCache() {
  _cache = null;
}
