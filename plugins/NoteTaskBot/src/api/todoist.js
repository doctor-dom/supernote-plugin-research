/**
 * Todoist API v1 client for NoteTaskBot
 */

import {log} from '../utils/debug';

const TODOIST_API = 'https://api.todoist.com/api/v1';
export const TARGET_PROJECT_NAME = 'NOTE TaskBot';

let _configLoader = null;

export function setConfigLoader(loader) {
  _configLoader = loader;
}

async function todoistFetch(path, options = {}) {
  if (!_configLoader) {
    throw new Error('Config loader not set');
  }
  const config = await _configLoader();
  if (!config.apiToken) {
    throw new Error('No API token configured. Edit MyStyle/NoteTaskBot/notetaskbot-config.json');
  }

  const url = `${TODOIST_API}${path}`;
  const method = options.method || 'GET';
  log('API', `${method} ${path}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Todoist ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function unwrapResult(result) {
  if (Array.isArray(result)) return result;
  if (result?.results) return result.results;
  return [];
}

async function fetchAllPages(path, params = '') {
  let allItems = [];
  let cursor = null;

  do {
    const sep = params || cursor ? '?' : '';
    const cursorParam = cursor ? `cursor=${encodeURIComponent(cursor)}` : '';
    const joinChar = params && cursorParam ? '&' : '';
    const url = `${path}${sep}${params}${joinChar}${cursorParam}`;
    const result = await todoistFetch(url);
    allItems = allItems.concat(unwrapResult(result));
    cursor = result?.next_cursor || null;
  } while (cursor);

  return allItems;
}

export async function getProjects() {
  return fetchAllPages('/projects');
}

export async function getProjectByName(name) {
  const projects = await getProjects();
  const match = projects.find(p => p.name === name);
  if (!match) {
    throw new Error(`Todoist project not found: "${name}". Create it in Todoist first.`);
  }
  return match;
}

export async function findTopLevelTask(projectId, content) {
  const tasks = await fetchAllPages('/tasks', `project_id=${projectId}`);
  return tasks.find(t => t.content === content && !t.parent_id);
}

export async function createTask({content, projectId, parentId}) {
  const body = {content};
  if (projectId) body.project_id = projectId;
  if (parentId) body.parent_id = parentId;

  log('API', `Creating task: "${content.slice(0, 40)}"${parentId ? ' (subtask)' : ''}`);
  return todoistFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Find or create the daily parent task: "Task Capture <file> | YYYY-MM-DD"
 */
export async function ensureParentTask(projectId, fileName, dateStr) {
  const title = `Task Capture ${fileName} | ${dateStr}`;
  const existing = await findTopLevelTask(projectId, title);
  if (existing) {
    log('API', `Using existing parent: ${title}`);
    return existing;
  }
  log('API', `Creating parent: ${title}`);
  return createTask({content: title, projectId});
}

export async function createSubtasks(projectId, parentId, lines) {
  const created = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const task = await createTask({content: trimmed, projectId, parentId});
    created.push(task);
  }
  return created;
}

export async function testConnection() {
  const projects = await getProjects();
  const target = projects.find(p => p.name === TARGET_PROJECT_NAME);
  return {
    ok: true,
    projectCount: projects.length,
    hasTargetProject: !!target,
    targetProjectId: target?.id || null,
  };
}
