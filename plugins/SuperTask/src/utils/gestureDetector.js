/**
 * Gesture Detector -- finger gesture detection for SuperTask.
 *
 * Two gestures detected from a single motion listener:
 *
 * 1. LONG PRESS (static hold):
 *    - Finger down, hold >= 800ms, NO movement, finger up
 *    - Scans for supertask:// links at touch point → opens task detail
 *
 * 2. LASSO-ADD (hold then drag):
 *    - Finger down, hold >= 400ms, THEN start moving (draw selection)
 *    - Bounding box of movement → programmatic lassoElements → QuickAdd
 *    - Minimum 50x50px bbox required to avoid tiny accidental selections
 *
 * Differentiator: movement that starts BEFORE 400ms = normal touch (neither).
 * Movement that starts AFTER 400ms hold = lasso-add. No movement = long press.
 *
 * Events only fire when the plugin UI is dismissed (full-screen RN view
 * intercepts all touches). The listener stays active across UI open/close.
 */

import {PluginManager, PluginCommAPI, PluginFileAPI} from 'sn-plugin-lib';
import {log} from './debug';
import {loadConfig} from './config';

// --- Action / tool decoding (matches Diagnostics format) ---
const ACTION_NAMES = {0: 'DOWN', 1: 'UP', 2: 'MOVE', 3: 'CANCEL', 5: 'PTR_DOWN', 6: 'PTR_UP'};
const TOOL_NAMES = {0: '???', 1: 'FINGER', 2: 'PEN'};

function decodeAction(raw) {
  const action = raw & 0xff;
  const ptrIdx = (raw >> 8) & 0xff;
  const name = ACTION_NAMES[action] || String(action);
  return ptrIdx > 0 ? `${name}[${ptrIdx}]` : name;
}

// --- Config ---
const LONG_PRESS_MS = 800;    // Minimum hold time for static long press
const LASSO_HOLD_MS = 400;    // Minimum hold before movement = lasso-add
const MAX_DRIFT_PX = 20;      // Movement threshold to differentiate gestures
const MIN_LASSO_SIZE = 50;    // Minimum bbox dimension to count as valid lasso
const HIT_PADDING_PX = 30;    // Extra padding around link bounds for hit test

// --- Module state ---
let _sub = null;               // Motion listener subscription
let _fingerDown = null;        // {x, y, time} of last finger DOWN
let _enabled = true;           // Can be toggled off
let _lassoToolType = 1;        // 1 = FINGER, 2 = PEN (loaded from config)

/**
 * Initialize the gesture detector. Call once at plugin startup.
 * Registers a motion listener for finger events.
 */
export function initGestureDetector() {
  if (_sub) {
    log('Gesture', 'Already initialized');
    return;
  }

  log('Gesture', 'Initializing gesture detector');

  // Load lasso gesture input preference
  loadConfig().then(config => {
    _lassoToolType = config.lassoGestureInput === 'pen' ? 2 : 1;
    log('Gesture', `Lasso gesture input: ${config.lassoGestureInput || 'finger'} (toolType=${_lassoToolType})`);
  }).catch(() => {});

  let _eventCount = 0;
  _sub = PluginManager.registerMotionListener(1, {
    onMsg: (msg) => {
      _eventCount++;
      const action = decodeAction(msg.action);
      const tool = TOOL_NAMES[msg.toolType] || String(msg.toolType);
      const x = Math.round(msg.x);
      const y = Math.round(msg.y);
      const p = msg.pressure?.toFixed(2) ?? '?';
      const ptrs = msg.pointerCount ?? msg.pointers?.length ?? '?';

      // Log every DOWN/UP/CANCEL, every 10th MOVE (same as Diagnostics)
      if ((msg.action & 0xff) !== 2 || _eventCount % 10 === 0) {
        log('Gesture', `#${_eventCount} ${action} ${tool} (${x},${y}) p=${p} ptrs=${ptrs}`);
      }

      if (!_enabled) return;

      // Mixed input detection: if the "other" tool type fires during a hold,
      // cancel the gesture. Catches gesture erase (pen + finger).
      // - For finger-mode lasso: pen activity cancels
      // - For pen-mode lasso: finger activity cancels
      if (_fingerDown) {
        const cancelTool = _lassoToolType === 1 ? 2 : 1;
        if (msg.toolType === cancelTool) {
          if (!_mixedInput) {
            log('Gesture', `${TOOL_NAMES[cancelTool]} activity during hold -- cancelling`);
            _mixedInput = true;
          }
        }
      }

      // Handle events from the configured lasso tool type.
      // Link long-press is always finger (toolType 1).
      // Lasso-add uses _lassoToolType (1 or 2).
      // When _lassoToolType is 'pen', finger events still handle link detection
      // but NOT lasso-add. When it's 'finger', both use finger.
      if (msg.toolType !== 1 && msg.toolType !== _lassoToolType) return;

      const baseAction = msg.action & 0xff;

      if (baseAction === 0 || baseAction === 5) {
        onFingerDown(msg.x, msg.y, msg.toolType);
      } else if (baseAction === 2) {
        onFingerMove(msg.x, msg.y, msg.toolType);
      } else if (baseAction === 1 || baseAction === 6) {
        onFingerUp(msg.x, msg.y, msg.toolType);
      } else if (baseAction === 3) {
        cancelLongPress();
      }
    },
  });

  log('Gesture', 'Motion listener registered');
}

/**
 * Clean up the gesture detector.
 */
export function destroyGestureDetector() {
  if (_sub) {
    _sub.remove();
    _sub = null;
  }
  cancelLongPress();
  log('Gesture', 'Destroyed');
}

/**
 * Enable/disable gesture detection without removing the listener.
 */
export function setGestureEnabled(enabled) {
  _enabled = enabled;
  if (!enabled) cancelLongPress();
  log('Gesture', `Enabled: ${enabled}`);
}

/**
 * Reload gesture config (call after settings change).
 */
export function reloadGestureConfig() {
  loadConfig().then(config => {
    _lassoToolType = config.lassoGestureInput === 'pen' ? 2 : 1;
    log('Gesture', `Config reloaded: lasso input=${config.lassoGestureInput || 'finger'}`);
  }).catch(() => {});
}

// --- Internal handlers ---
// NOTE: setTimeout does NOT fire when the plugin view is closed (JS timers
// are suspended). Long press is detected on the UP event by checking hold
// duration -- per gesture-research.md, long press has ZERO MOVE events.

let _driftExceeded = false;  // Track if finger moved too much (before hold threshold)
let _mixedInput = false;     // Track if pen occurred during hold
let _linkScanPromise = null; // Async pre-scan started on finger DOWN
let _lassoMode = false;      // Whether we've entered lasso-drawing mode
let _lassoBbox = null;       // {minX, minY, maxX, maxY} bounding box of movement

function onFingerDown(x, y, toolType) {
  _fingerDown = {x, y, time: Date.now(), toolType};
  _driftExceeded = false;
  _mixedInput = false;
  _lassoMode = false;
  _lassoBbox = null;
  // Start scanning for links immediately (finger only -- link activation)
  if (toolType === 1) {
    _linkScanPromise = preScanLinks(x, y);
  }
  log('Gesture', `DOWN at (${Math.round(x)},${Math.round(y)})`);
}

function onFingerMove(x, y, toolType) {
  if (!_fingerDown || _mixedInput) return;
  // Only the lasso tool type can enter lasso mode
  if (toolType !== _lassoToolType) return;

  // Already in lasso mode -- just extend the bounding box
  if (_lassoMode) {
    _lassoBbox.minX = Math.min(_lassoBbox.minX, x);
    _lassoBbox.minY = Math.min(_lassoBbox.minY, y);
    _lassoBbox.maxX = Math.max(_lassoBbox.maxX, x);
    _lassoBbox.maxY = Math.max(_lassoBbox.maxY, y);
    return;
  }

  // Not yet in lasso mode -- check drift
  const dx = x - _fingerDown.x;
  const dy = y - _fingerDown.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > MAX_DRIFT_PX) {
    const elapsed = Date.now() - _fingerDown.time;

    if (elapsed >= LASSO_HOLD_MS) {
      // Held long enough before moving -- enter lasso-add mode
      _lassoMode = true;
      _lassoBbox = {
        minX: Math.min(_fingerDown.x, x),
        minY: Math.min(_fingerDown.y, y),
        maxX: Math.max(_fingerDown.x, x),
        maxY: Math.max(_fingerDown.y, y),
      };
      log('Gesture', `LASSO MODE entered after ${elapsed}ms hold (${TOOL_NAMES[toolType]})`);
    } else {
      // Moved too early -- not a gesture, just normal touch
      log('Gesture', `DRIFT: ${Math.round(dist)}px after ${elapsed}ms -- too early for gesture`);
      _driftExceeded = true;
    }
  }
}

function onFingerUp(x, y, toolType) {
  if (!_fingerDown) return;

  const held = Date.now() - _fingerDown.time;

  if (_lassoMode && _lassoBbox && toolType === _lassoToolType) {
    // Lasso-add gesture: compute final bbox
    _lassoBbox.minX = Math.min(_lassoBbox.minX, x);
    _lassoBbox.minY = Math.min(_lassoBbox.minY, y);
    _lassoBbox.maxX = Math.max(_lassoBbox.maxX, x);
    _lassoBbox.maxY = Math.max(_lassoBbox.maxY, y);

    const w = _lassoBbox.maxX - _lassoBbox.minX;
    const h = _lassoBbox.maxY - _lassoBbox.minY;

    log('Gesture', `LASSO UP: bbox=${Math.round(_lassoBbox.minX)},${Math.round(_lassoBbox.minY)} ${Math.round(w)}x${Math.round(h)} held=${held}ms`);

    if (w >= MIN_LASSO_SIZE && h >= MIN_LASSO_SIZE) {
      log('Gesture', `LASSO-ADD DETECTED: ${Math.round(w)}x${Math.round(h)}px`);
      handleLassoAdd(_lassoBbox);
    } else {
      log('Gesture', `Lasso too small (${Math.round(w)}x${Math.round(h)}), ignoring`);
    }

    resetState();
    return;
  }

  log('Gesture', `UP at (${Math.round(x)},${Math.round(y)}) after ${held}ms drift=${_driftExceeded} mixed=${_mixedInput}`);

  // Static long press (finger only): held >= threshold, no drift, no mixed input
  if (toolType === 1 && held >= LONG_PRESS_MS && !_driftExceeded && !_mixedInput) {
    log('Gesture', `LONG PRESS DETECTED at (${Math.round(_fingerDown.x)},${Math.round(_fingerDown.y)}) held ${held}ms`);
    handleLongPress();
  }

  resetState();
}

function resetState() {
  _fingerDown = null;
  _driftExceeded = false;
  _mixedInput = false;
  _lassoMode = false;
  _lassoBbox = null;
}

function cancelLongPress() {
  resetState();
  _linkScanPromise = null;
}

// --- Pre-scan: runs on finger DOWN, overlapping with hold time ---

async function preScanLinks(x, y) {
  try {
    const [fpResult, pnResult] = await Promise.all([
      PluginCommAPI.getCurrentFilePath(),
      PluginCommAPI.getCurrentPageNum(),
    ]);
    const filePath = fpResult?.result || '';
    const pageNum = pnResult?.result ?? 0;

    if (!filePath) {
      log('Gesture', 'Pre-scan: no active note');
      return null;
    }

    log('Gesture', `Pre-scan: page ${pageNum} of ${filePath} at (${Math.round(x)},${Math.round(y)})`);

    const elemResult = await PluginFileAPI.getElements(pageNum, filePath);
    if (!elemResult?.success || !elemResult.result) {
      log('Gesture', `Pre-scan: getElements failed`);
      return null;
    }

    const elements = elemResult.result;
    const stLinks = elements.filter(
      (el) => el.type === 600 && el.link?.destPath?.startsWith('supertask://task/')
    );

    if (stLinks.length === 0) {
      log('Gesture', 'Pre-scan: no supertask links on page');
      recycleAll(elements);
      return null;
    }

    log('Gesture', `Pre-scan: ${stLinks.length} links, hit-testing...`);

    // Hit-test against touch point
    for (const el of stLinks) {
      const link = el.link;
      if (link.width > 0 && link.height > 0) {
        const left = link.X - HIT_PADDING_PX;
        const top = link.Y - HIT_PADDING_PX;
        const right = link.X + link.width + HIT_PADDING_PX;
        const bottom = link.Y + link.height + HIT_PADDING_PX;

        if (x >= left && x <= right && y >= top && y <= bottom) {
          const taskId = link.destPath.replace('supertask://task/', '');
          log('Gesture', `Pre-scan: hit link -> task ${taskId}`);
          recycleAll(elements);
          return {taskId};
        }
      }
    }

    // Fallback: single link on page with no bounds match
    if (stLinks.length === 1) {
      const taskId = stLinks[0].link.destPath.replace('supertask://task/', '');
      log('Gesture', `Pre-scan: no bounds hit, using only link -> task ${taskId}`);
      recycleAll(elements);
      return {taskId};
    }

    log('Gesture', `Pre-scan: no hit among ${stLinks.length} links`);
    recycleAll(elements);
    return null;
  } catch (e) {
    log('Gesture', `Pre-scan error: ${e.message}`);
    return null;
  }
}

// --- Long press action ---

async function handleLongPress() {
  const scanPromise = _linkScanPromise;
  cancelLongPress(); // Prevent re-entry

  if (!scanPromise) return;

  try {
    const result = await scanPromise;
    if (!result) {
      log('Gesture', 'No link at touch point, ignoring');
      return;
    }

    const {taskId} = result;
    log('Gesture', `Matched task: ${taskId}`);

    // Set deep link and open the plugin UI
    global.__superTaskDeepLink = {taskId, action: 'view-task'};
    openPluginView();

  } catch (e) {
    log('Gesture', `Error in handleLongPress: ${e.message}`);
  }
}

// --- Lasso-add action ---

async function handleLassoAdd(bbox) {
  const rect = {
    left: Math.round(bbox.minX),
    top: Math.round(bbox.minY),
    right: Math.round(bbox.maxX),
    bottom: Math.round(bbox.maxY),
  };

  log('Gesture', `lassoElements rect: l=${rect.left} t=${rect.top} r=${rect.right} b=${rect.bottom}`);

  try {
    // Programmatically create the lasso selection
    // (No pre-check: element coords are in EMR space, not pixel space.
    // Let lassoElements determine if content exists in the region.)
    const result = await PluginCommAPI.lassoElements(rect);
    log('Gesture', `lassoElements result: ${JSON.stringify(result)}`);

    if (!result?.success) {
      log('Gesture', 'lassoElements failed -- no content in region?');
      return;
    }

    // Open plugin to QuickAdd (same screen as lasso toolbar button 200)
    global.__superTaskDeepLink = {action: 'lasso-add'};
    openPluginView();
  } catch (e) {
    log('Gesture', `handleLassoAdd error: ${e.message}`);
  }
}

function recycleAll(elements) {
  try {
    elements.forEach((el) => {
      if (el.recycle) el.recycle();
    });
  } catch {}
}

async function openPluginView() {
  try {
    // If App is already mounted, navigate directly via the exposed callback.
    // This handles the re-show case where getInitialScreen() won't re-run.
    const deepLink = global.__superTaskDeepLink;
    if (deepLink && global.__superTaskNavigate) {
      global.__superTaskDeepLink = null;
      log('Gesture', `Navigating via __superTaskNavigate: ${deepLink.action} taskId=${deepLink.taskId}`);
      if (deepLink.action === 'view-task' && deepLink.taskId) {
        global.__superTaskNavigate('deep-link-loading', {taskId: deepLink.taskId});
      } else if (deepLink.action === 'lasso-add') {
        global.__superTaskNavigate('capture-lasso');
      } else if (deepLink.action === 'this-page') {
        global.__superTaskNavigate('task-home', {focusTab: 'today'});
      }
    }
    // If App isn't mounted yet, getInitialScreen() reads the global on mount.

    log('Gesture', 'Calling showPluginView()...');
    const result = await PluginManager.showPluginView();
    log('Gesture', `showPluginView result: ${result}`);
  } catch (e) {
    log('Gesture', `showPluginView failed: ${e.message}`);
  }
}
