/**
 * Gesture Detector -- long-press finger detection for supertask:// link activation.
 *
 * Registers a motion listener at plugin init. When the user long-presses
 * on marked handwriting (finger, >800ms, <20px drift), scans the current
 * page for supertask:// links at the touch point and opens the plugin to
 * that task's detail view.
 *
 * Events only fire when the plugin UI is dismissed (full-screen RN view
 * intercepts all touches). The listener stays active across UI open/close.
 */

import {PluginManager, PluginCommAPI, PluginFileAPI} from 'sn-plugin-lib';
import {log} from './debug';

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
const LONG_PRESS_MS = 800;    // Minimum hold time for long press
const MAX_DRIFT_PX = 20;      // Maximum finger movement during hold
const HIT_PADDING_PX = 30;    // Extra padding around link bounds for hit test

// --- Module state ---
let _sub = null;               // Motion listener subscription
let _fingerDown = null;        // {x, y, time} of last finger DOWN
let _enabled = true;           // Can be toggled off

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

      // If pen activity or multi-pointer detected during a finger hold,
      // cancel -- this is a gesture erase, two-finger lasso, etc.
      if (_fingerDown) {
        const ptrs = msg.pointerCount ?? msg.pointers?.length ?? 1;
        if (msg.toolType === 2 || ptrs > 1) {
          if (!_mixedInput) {
            log('Gesture', `Mixed input during hold (tool=${tool} ptrs=${ptrs}) -- cancelling`);
            _mixedInput = true;
          }
        }
      }

      // Only handle finger events (toolType 1)
      if (msg.toolType !== 1) return;

      const baseAction = msg.action & 0xff;

      if (baseAction === 0 || baseAction === 5) {
        // FINGER DOWN or PTR_DOWN
        onFingerDown(msg.x, msg.y);
      } else if (baseAction === 2) {
        // FINGER MOVE
        onFingerMove(msg.x, msg.y);
      } else if (baseAction === 1 || baseAction === 6) {
        // FINGER UP or PTR_UP
        onFingerUp(msg.x, msg.y);
      } else if (baseAction === 3) {
        // CANCEL
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

// --- Internal handlers ---
// NOTE: setTimeout does NOT fire when the plugin view is closed (JS timers
// are suspended). Long press is detected on the UP event by checking hold
// duration -- per gesture-research.md, long press has ZERO MOVE events.

let _driftExceeded = false;  // Track if finger moved too much
let _mixedInput = false;     // Track if pen/multi-pointer occurred during hold
let _linkScanPromise = null; // Async pre-scan started on finger DOWN

function onFingerDown(x, y) {
  _fingerDown = {x, y, time: Date.now()};
  _driftExceeded = false;
  _mixedInput = false;
  // Start scanning for links immediately -- runs during the hold so
  // results are ready by the time the finger lifts.
  _linkScanPromise = preScanLinks(x, y);
  log('Gesture', `DOWN at (${Math.round(x)},${Math.round(y)})`);
}

function onFingerMove(x, y) {
  if (!_fingerDown || _driftExceeded) return;

  // Check drift
  const dx = x - _fingerDown.x;
  const dy = y - _fingerDown.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > MAX_DRIFT_PX) {
    log('Gesture', `DRIFT: ${Math.round(dist)}px > ${MAX_DRIFT_PX}px -- not a long press`);
    _driftExceeded = true;
  }
}

function onFingerUp(x, y) {
  if (!_fingerDown) return;

  const held = Date.now() - _fingerDown.time;
  log('Gesture', `UP at (${Math.round(x)},${Math.round(y)}) after ${held}ms drift=${_driftExceeded} mixed=${_mixedInput}`);

  // Long press: held >= threshold, no excessive drift, finger-only (no pen/multi-touch)
  if (held >= LONG_PRESS_MS && !_driftExceeded && !_mixedInput) {
    log('Gesture', `LONG PRESS DETECTED at (${Math.round(_fingerDown.x)},${Math.round(_fingerDown.y)}) held ${held}ms`);
    handleLongPress();
  }

  _fingerDown = null;
  _driftExceeded = false;
}

function cancelLongPress() {
  _fingerDown = null;
  _driftExceeded = false;
  _mixedInput = false;
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
