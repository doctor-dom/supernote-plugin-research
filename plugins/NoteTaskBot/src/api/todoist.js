/**
 * Todoist API v1 client for NoteTaskBot
 */

import {log} from '../utils/debug';

const TODOIST_API = 'https://api.todoist.com/api/v1';
/** NOTE TaskBot 📨🤖 — use project ID, not display name (name includes emojis). */
export const DEFAULT_TARGET_PROJECT_ID = '6fVCFGxCf6MVJwm8';

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

export async function getTargetProject() {
  const config = await _configLoader();
  const projectId = config.targetProjectId || DEFAULT_TARGET_PROJECT_ID;
  log('API', `Using target project id=${projectId}`);

  const projects = await getProjects();
  const match = projects.find(p => p.id === projectId);
  if (!match) {
    log('API', `WARNING: project id=${projectId} not found in account`);
    return {id: projectId, name: null, missing: true};
  }
  return {id: projectId, name: match.name, missing: false};
}

function taskId(task) {
  return task?.id ?? task?.task_id ?? task?.taskId ?? null;
}

function taskParentId(task) {
  return task?.parent_id ?? task?.parentId ?? null;
}

function isTaskCompleted(task) {
  return !!(task?.checked || task?.completed || task?.is_completed);
}

function displayPageNum(pageNum) {
  return Math.max(1, (pageNum ?? 0) + 1);
}

/**
 * Parent title for a new capture: SN: <file name | page> date
 * Example: SN: CHP Meeting | 3 2026-06-30
 */
export function buildParentTitle(fileName, pageNum, dateStr) {
  const page = displayPageNum(pageNum);
  return `SN: ${fileName} | ${page} ${dateStr}`;
}

/**
 * Match any top-level parent for this note file on this date.
 * Same document reuses one parent across multiple lasso captures (any page).
 */
export function matchesDocumentParent(content, fileName, dateStr) {
  if (!content || !fileName || !dateStr) return false;

  const snPrefix = `SN: ${fileName} |`;
  const legacyPrefix = `Task Capture ${fileName} |`;

  if (content.startsWith(snPrefix)) {
    return content.endsWith(` ${dateStr}`);
  }
  if (content.startsWith(legacyPrefix)) {
    return content === `${legacyPrefix} ${dateStr}` || content.endsWith(` ${dateStr}`);
  }
  return false;
}

export async function findDocumentParent(projectId, fileName, dateStr) {
  const tasks = await fetchAllPages('/tasks', `project_id=${projectId}`);
  const matches = tasks.filter(
    t => !taskParentId(t) && matchesDocumentParent(t.content, fileName, dateStr),
  );
  if (matches.length === 0) return null;

  // Prefer active SN:-prefixed parent, then any active match, then first match.
  const score = t => {
    let s = 0;
    if (t.content?.startsWith('SN:')) s += 4;
    if (!isTaskCompleted(t)) s += 2;
    return s;
  };
  matches.sort((a, b) => score(b) - score(a));
  const best = matches[0];
  log('API', `Found document parent: "${best.content}" (${matches.length} candidate(s))`);
  return best;
}

function parseCreatedTask(result, content) {
  if (!result || typeof result !== 'object') {
    throw new Error(`Todoist returned empty response for "${content.slice(0, 40)}"`);
  }
  const id = taskId(result);
  if (!id) {
    throw new Error(
      `Todoist response missing task id for "${content.slice(0, 40)}": ${JSON.stringify(result).slice(0, 120)}`,
    );
  }
  return {...result, id, content: result.content || content};
}

export async function reopenTask(taskId) {
  log('API', `Reopening task ${taskId}`);
  return todoistFetch(`/tasks/${taskId}/reopen`, {method: 'POST'});
}

async function ensureTaskActive(task) {
  const id = taskId(task);
  if (!id || !isTaskCompleted(task)) return task;
  await reopenTask(id);
  return {...task, checked: false, completed: false, is_completed: false};
}

export async function createTask({content, projectId, parentId}) {
  const body = {content};
  if (projectId) body.project_id = projectId;
  if (parentId) body.parent_id = parentId;

  log('API', `Creating task: "${content.slice(0, 40)}"${parentId ? ' (subtask)' : ''}`);
  const result = await todoistFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const task = parseCreatedTask(result, content);
  log('API', `Created id=${task.id}`);
  return task;
}

/**
 * Find or create the document parent for today.
 * Multiple lasso captures in the same note reuse this parent and append subtasks.
 */
export async function ensureParentTask(projectId, fileName, pageNum, dateStr) {
  const existing = await findDocumentParent(projectId, fileName, dateStr);
  if (existing) {
    log('API', `Reusing parent for ${fileName} on ${dateStr}`);
    const id = taskId(existing);
    const active = await ensureTaskActive(existing);
    const task = {...active, id, content: active.content || existing.content};
    return {task, reused: true};
  }

  const title = buildParentTitle(fileName, pageNum, dateStr);
  log('API', `Creating parent: ${title}`);
  const task = await createTask({content: title, projectId});
  return {task, reused: false};
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
  const targetId = (await _configLoader()).targetProjectId || DEFAULT_TARGET_PROJECT_ID;
  const target = projects.find(p => p.id === targetId);
  return {
    ok: true,
    projectCount: projects.length,
    hasTargetProject: !!target,
    targetProjectId: targetId,
    targetProjectName: target?.name || null,
  };
}
