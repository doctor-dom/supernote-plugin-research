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
  enabledProjectIds: [],
  defaultTab: 'today',
};

// In-memory config (survives within a session, lost on plugin restart)
let _runtimeConfig = null;

export async function loadConfig() {
  if (_runtimeConfig) {
    return {...DEFAULT_CONFIG, ...bundledConfig, ..._runtimeConfig};
  }
  return {...DEFAULT_CONFIG, ...bundledConfig};
}

export async function saveConfig(config) {
  // Save to runtime memory (persists within this plugin session)
  _runtimeConfig = {..._runtimeConfig, ...config};
  // TODO: persist to plugin directory once we confirm the write API
}

export async function loadProjectCache() {
  // TODO: read from plugin directory
  return null;
}

export async function saveProjectCache(projects) {
  // TODO: write to plugin directory
}
