/**
 * Gesture Detector -- finger gesture detection for SuperTask.
 *
 * Two gestures detected from a single motion listener:
 *
 * 1. LONG PRESS (static hold):
 *    - Finger down, hold >= 800ms, NO movement, finger up
 *    - Scans for supertask:// links at touch point -> opens task detail
 *
 * 2. LASSO-ADD (hold then drag):
 *    - Finger down, hold >= 400ms, THEN start moving (draw selection)
 *    - Blocked if pre-scan found a supertask link at touch point (already captured)
 *    - Bounding box of movement -> programmatic lassoElements -> QuickAdd
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
let _configOff = false;        // True when config is 'off' -- overrides _enabled
let _actionInProgress = false; // Re-entry guard for async handlers
let _scanGeneration = 0;       // Increments on each DOWN; stale pre-scans bail out

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

  // Load gesture config ('off' or 'on')
  loadConfig().then(config => {
    applyGestureConfig(config.lassoGestureInput);
  }).catch(() => {});

  let _eventCount = 0;
  _sub = PluginManager.registerMotionListener(1, {
    onMsg: (msg) => {
      _eventCount++;

      if (!_enabled || _actionInProgress) return;

      // Only handle finger events (toolType 1)
      if (msg.toolType !== 1) {
        // Pen during finger hold -> cancel gesture (catches gesture erase,
        // native two-finger lasso where pen events follow finger down)
        if (_fingerDown && !_mixedInput) {
          log('Gesture', `PEN during FINGER hold -- cancelling`);
          _mixedInput = true;
          _mixedCancelTime = Date.now();
        }
        return;
      }

      const action = decodeAction(msg.action);
      const x = Math.round(msg.x);
      const y = Math.round(msg.y);
      const p = msg.pressure?.toFixed(2) ?? '?';
      const ptrs = msg.pointerCount ?? msg.pointers?.length ?? '?';

      // Log every DOWN/UP/CANCEL, every 10th MOVE
      if ((msg.action & 0xff) !== 2 || _eventCount % 10 === 0) {
        log('Gesture', `#${_eventCount} ${action} FINGER (${x},${y}) p=${p} ptrs=${ptrs}`);
      }

      const baseAction = msg.action & 0xff;

      if (baseAction === 0) {
        onFingerDown(msg.x, msg.y);
      } else if (baseAction === 2) {
        onFingerMove(msg.x, msg.y);
      } else if (baseAction === 1) {
        onFingerUp(msg.x, msg.y);
      } else if (baseAction === 5) {
        // Additional pointer DOWN (multi-touch) -- cancel, not our gesture
        if (_fingerDown) {
          log('Gesture', 'Multi-touch detected (PTR_DOWN) -- cancelling');
          cancelGesture();
        }
      } else if (baseAction === 3) {
        cancelGesture();
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
  cancelGesture();
  log('Gesture', 'Destroyed');
}

/**
 * Enable/disable gesture detection without removing the listener.
 */
export function setGestureEnabled(enabled) {
  // Config 'off' takes priority -- don't let App mount/unmount override it
  if (_configOff) {
    log('Gesture', `setGestureEnabled(${enabled}) ignored: config is off`);
    return;
  }
  _enabled = enabled;
  if (!enabled) cancelGesture();
  log('Gesture', `Enabled: ${enabled}`);
}

/**
 * Reload gesture config (call after settings change).
 */
export function reloadGestureConfig() {
  loadConfig().then(config => {
    applyGestureConfig(config.lassoGestureInput);
  }).catch(() => {});
}

function applyGestureConfig(input) {
  if (input === 'off') {
    _configOff = true;
    _enabled = false;
    cancelGesture();
    log('Gesture', 'Config: gestures OFF');
  } else {
    _configOff = false;
    _enabled = true;
    log('Gesture', 'Config: gestures ON');
  }
}

// --- Internal handlers ---
// NOTE: setTimeout does NOT fire when the plugin view is closed (JS timers
// are suspended). Long press is detected on the UP event by checking hold
// duration -- per gesture-research.md, long press has ZERO MOVE events.

let _driftExceeded = false;  // Track if finger moved too much (before hold threshold)
let _mixedInput = false;     // Track if pen occurred during hold
let _linkScanPromise = null; // Async pre-scan started on finger DOWN
let _preScanResult = null;   // Sync cache of resolved pre-scan (for fast-path gate)
let _lassoMode = false;      // Whether we've entered lasso-drawing mode
let _lassoBbox = null;       // {minX, minY, maxX, maxY} bounding box of movement
let _mixedCancelTime = 0;    // Timestamp of last mixed-input cancellation

function onFingerDown(x, y) {
  // Suppress new gesture starts shortly after a mixed-input cancellation.
  const MIXED_COOLDOWN_MS = 500;
  if (Date.now() - _mixedCancelTime < MIXED_COOLDOWN_MS) {
    log('Gesture', `DOWN suppressed: within ${MIXED_COOLDOWN_MS}ms of mixed-input cancel`);
    return;
  }

  _fingerDown = {x, y, time: Date.now()};
  _driftExceeded = false;
  _mixedInput = false;
  _lassoMode = false;
  _lassoBbox = null;
  _preScanResult = null;
  // Start scanning for links immediately (overlaps with hold time)
  const gen = ++_scanGeneration;
  _linkScanPromise = preScanLinks(x, y, gen).then(r => {
    if (gen === _scanGeneration) _preScanResult = r;
    return r;
  });
  log('Gesture', `DOWN at (${Math.round(x)},${Math.round(y)}) tool=FINGER`);
}

function onFingerMove(x, y) {
  if (!_fingerDown || _mixedInput) return;

  // Already in lasso mode -- just extend the bounding box
  if (_lassoMode) {
    _lassoBbox.minX = Math.min(_lassoBbox.minX, x);
    _lassoBbox.minY = Math.min(_lassoBbox.minY, y);
    _lassoBbox.maxX = Math.max(_lassoBbox.maxX, x);
    _lassoBbox.maxY = Math.max(_lassoBbox.maxY, y);
    return;
  }

  const dx = x - _fingerDown.x;
  const dy = y - _fingerDown.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > MAX_DRIFT_PX) {
    const elapsed = Date.now() - _fingerDown.time;

    if (elapsed >= LASSO_HOLD_MS) {
      // Fast-path gate: if pre-scan already resolved and found a link, block lasso mode
      if (_preScanResult?.taskId) {
        log('Gesture', `LASSO blocked: DOWN on existing task ${_preScanResult.taskId}`);
        _driftExceeded = true; // Prevent further gesture processing
        return;
      }
      // Held long enough before moving -- enter lasso-add mode
      _lassoMode = true;
      _lassoBbox = {
        minX: Math.min(_fingerDown.x, x),
        minY: Math.min(_fingerDown.y, y),
        maxX: Math.max(_fingerDown.x, x),
        maxY: Math.max(_fingerDown.y, y),
      };
      log('Gesture', `LASSO MODE entered after ${elapsed}ms hold`);
    } else {
      // Moved too early -- not a gesture, just normal touch
      log('Gesture', `DRIFT: ${Math.round(dist)}px after ${elapsed}ms -- too early for gesture`);
      _driftExceeded = true;
    }
  }
}

function onFingerUp(x, y) {
  if (!_fingerDown) return;

  const held = Date.now() - _fingerDown.time;

  if (_lassoMode && _lassoBbox && !_mixedInput) {
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

  if (_mixedInput) {
    log('Gesture', `UP ignored: mixed input detected during gesture`);
    resetState();
    return;
  }

  log('Gesture', `UP at (${Math.round(x)},${Math.round(y)}) after ${held}ms drift=${_driftExceeded} mixed=${_mixedInput}`);

  // Static long press: held >= threshold, no drift, no mixed input
  if (held >= LONG_PRESS_MS && !_driftExceeded && !_mixedInput) {
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
  _preScanResult = null;
}

function cancelGesture() {
  resetState();
  _linkScanPromise = null;
}

// --- Pre-scan: runs on finger DOWN, overlapping with hold time ---
// Uses a generation counter so stale scans bail out after each await
// instead of piling up on the native AIDL bridge.

async function preScanLinks(x, y, generation) {
  try {
    const [fpResult, pnResult] = await Promise.all([
      PluginCommAPI.getCurrentFilePath(),
      PluginCommAPI.getCurrentPageNum(),
    ]);

    if (generation !== _scanGeneration) return null; // stale

    const filePath = fpResult?.result || '';
    const pageNum = pnResult?.result ?? 0;

    if (!filePath) {
      log('Gesture', 'Pre-scan: no active note');
      return null;
    }

    log('Gesture', `Pre-scan: page ${pageNum} of ${filePath} at (${Math.round(x)},${Math.round(y)})`);

    const elemResult = await PluginFileAPI.getElements(pageNum, filePath);

    if (generation !== _scanGeneration) {
      // Stale -- recycle and bail
      if (elemResult?.result) recycleAll(elemResult.result);
      return null;
    }

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
  if (_actionInProgress) {
    log('Gesture', 'handleLongPress: skipped, action already in progress');
    return;
  }
  _actionInProgress = true;

  try {
    const scanPromise = _linkScanPromise;
    cancelGesture(); // Prevent re-entry

    if (!scanPromise) return;

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
  } finally {
    _actionInProgress = false;
  }
}

// --- Lasso-add action ---

async function handleLassoAdd(bbox) {
  if (_actionInProgress) {
    log('Gesture', 'handleLassoAdd: skipped, action already in progress');
    return;
  }
  _actionInProgress = true;

  try {
    // Gate: if pre-scan found a supertask link at the DOWN point, abort.
    // The pre-scan has already resolved by finger UP (runs during hold time).
    const scanPromise = _linkScanPromise;
    try {
      const scanResult = scanPromise ? await scanPromise : null;
      if (scanResult?.taskId) {
        log('Gesture', `LASSO-ADD ABORTED: DOWN point on existing task ${scanResult.taskId}`);
        return;
      }
    } catch (e) {
      // Pre-scan failed -- proceed with lasso-add
    }

    const rect = {
      left: Math.round(bbox.minX),
      top: Math.round(bbox.minY),
      right: Math.round(bbox.maxX),
      bottom: Math.round(bbox.maxY),
    };

    log('Gesture', `lassoElements rect: l=${rect.left} t=${rect.top} r=${rect.right} b=${rect.bottom}`);

    const result = await PluginCommAPI.lassoElements(rect);
    log('Gesture', `lassoElements result: ${JSON.stringify(result)}`);

    // lassoElements returns {success: true, result: false} when the API call
    // succeeds but nothing was actually selected in the region. Must check both.
    if (!result?.success || result.result === false) {
      log('Gesture', 'lassoElements: no content selected in region');
      return;
    }

    // Open plugin to QuickAdd (same screen as lasso toolbar button 200)
    global.__superTaskDeepLink = {action: 'lasso-add'};
    openPluginView();
  } catch (e) {
    log('Gesture', `handleLassoAdd error: ${e.message}`);
  } finally {
    _actionInProgress = false;
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

    setGestureEnabled(false);
    log('Gesture', 'Gestures OFF (opening plugin view)');
    const result = await PluginManager.showPluginView();
    log('Gesture', `showPluginView result: ${result}`);
  } catch (e) {
    log('Gesture', `showPluginView failed: ${e.message}`);
  }
}
