/**
 * Todoist API v1 client
 *
 * All task CRUD operations go through here. Uses the device's
 * fetch() which works on Supernote without restrictions.
 */

import {log, logError} from '../utils/debug';

const TODOIST_API = 'https://api.todoist.com/api/v1';

let _configLoader = null;

export function setConfigLoader(loader) {
  _configLoader = loader;
}

async function todoistFetch(path, options = {}) {
  if (!_configLoader) {
    throw new Error('Config loader not set. Call setConfigLoader first.');
  }

  log('API', `Loading config...`);
  const config = await _configLoader();
  if (!config.apiToken) {
    throw new Error('No API token configured');
  }

  const url = `${TODOIST_API}${path}`;
  const method = options.method || 'GET';
  log('API', `${method} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  log('API', `Response: ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Todoist ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function getTasks(filter) {
  const params = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  const result = await todoistFetch(`/tasks${params}`);
  log('API', `getTasks raw type: ${typeof result}, isArray: ${Array.isArray(result)}`);
  if (Array.isArray(result)) return result;
  // v1 API may wrap tasks in an object
  if (result && typeof result === 'object') {
    log('API', `getTasks keys: ${Object.keys(result).join(', ')}`);
    if (Array.isArray(result.results)) return result.results;
    if (Array.isArray(result.items)) return result.items;
    if (Array.isArray(result.tasks)) return result.tasks;
  }
  log('API', `getTasks: unexpected format, returning empty array`);
  return [];
}

export async function getProjects() {
  const result = await todoistFetch('/projects');
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    if (Array.isArray(result.results)) return result.results;
    if (Array.isArray(result.items)) return result.items;
  }
  return [];
}

export async function createTask({content, description, projectId, priority, dueString}) {
  const body = {content};
  if (description) body.description = description;
  if (projectId) body.project_id = projectId;
  if (priority) body.priority = priority;
  if (dueString) body.due_string = dueString;

  log('API', `Creating task: ${content}`);
  return todoistFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateTask(taskId, updates) {
  return todoistFetch(`/tasks/${taskId}`, {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function completeTask(taskId) {
  return todoistFetch(`/tasks/${taskId}/close`, {method: 'POST'});
}

export async function deleteTask(taskId) {
  return todoistFetch(`/tasks/${taskId}`, {method: 'DELETE'});
}

export async function testConnection() {
  log('API', 'Testing connection...');
  const projects = await getProjects();
  const tasks = await getTasks();
  return {
    ok: true,
    projectCount: projects?.length ?? 0,
    taskCount: tasks?.length ?? 0,
  };
}
