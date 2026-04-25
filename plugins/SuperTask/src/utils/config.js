/**
 * Config management
 *
 * For now, uses the bundled config.local.js for the API token.
 * Filesystem read/write will be added once we confirm which
 * SDK APIs are available for file persistence.
 */

// Bundled config (build-time, gitignored)
let bundledConfig = {};
try {
  const localConfig = require('../../config.local');
  bundledConfig = localConfig.default || localConfig;
} catch {
  // No config.local.js
}

const DEFAULT_CONFIG = {
  apiToken: '',
  defaultProjectId: null,
  defaultPriority: 1,
};

export async function loadConfig() {
  return {...DEFAULT_CONFIG, ...bundledConfig};
}

export async function saveConfig(config) {
  // TODO: persist to plugin directory once we confirm the write API
}

export async function loadProjectCache() {
  // TODO: read from plugin directory
  return null;
}

export async function saveProjectCache(projects) {
  // TODO: write to plugin directory
}
