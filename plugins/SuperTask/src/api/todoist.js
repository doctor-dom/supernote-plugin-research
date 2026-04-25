/**
 * Todoist REST API v2 client
 *
 * All task CRUD operations go through here. Uses the device's
 * fetch() which works on Supernote without restrictions.
 */

const TODOIST_API = 'https://api.todoist.com/rest/v2';

let _configLoader = null;

export function setConfigLoader(loader) {
  _configLoader = loader;
}

async function todoistFetch(path, options = {}) {
  if (!_configLoader) {
    throw new Error('Config loader not set. Call setConfigLoader first.');
  }

  const config = await _configLoader();
  if (!config.apiToken) {
    throw new Error('No API token configured');
  }

  const response = await fetch(`${TODOIST_API}${path}`, {
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

export async function getTasks(filter) {
  const params = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return todoistFetch(`/tasks${params}`);
}

export async function getProjects() {
  return todoistFetch('/projects');
}

export async function createTask({content, description, projectId, priority, dueString}) {
  const body = {content};
  if (description) body.description = description;
  if (projectId) body.project_id = projectId;
  if (priority) body.priority = priority;
  if (dueString) body.due_string = dueString;

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
  const projects = await getProjects();
  const tasks = await getTasks();
  return {
    ok: true,
    projectCount: projects.length,
    taskCount: tasks.length,
  };
}
