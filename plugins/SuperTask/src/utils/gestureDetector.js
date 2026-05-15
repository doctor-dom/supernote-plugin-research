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

// --- Config ---
const LONG_PRESS_MS = 800;    // Minimum hold time for long press
const MAX_DRIFT_PX = 20;      // Maximum finger movement during hold
const HIT_PADDING_PX = 30;    // Extra padding around link bounds for hit test

// --- Module state ---
let _sub = null;               // Motion listener subscription
let _fingerDown = null;        // {x, y, time} of last finger DOWN
let _longPressTimer = null;    // Timer ID for long-press detection
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

  _sub = PluginManager.registerMotionListener(1, {
    onMsg: (msg) => {
      if (!_enabled) return;
      // Only handle finger events (toolType 1)
      if (msg.toolType !== 1) return;

      const action = msg.action & 0xff;

      if (action === 0 || action === 5) {
        // FINGER DOWN or PTR_DOWN
        onFingerDown(msg.x, msg.y);
      } else if (action === 2) {
        // FINGER MOVE
        onFingerMove(msg.x, msg.y);
      } else if (action === 1 || action === 6) {
        // FINGER UP or PTR_UP
        onFingerUp(msg.x, msg.y);
      } else if (action === 3) {
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

function onFingerDown(x, y) {
  cancelLongPress();
  _fingerDown = {x, y, time: Date.now()};

  // Start long-press timer
  _longPressTimer = setTimeout(() => {
    if (_fingerDown) {
      log('Gesture', `Long press detected at (${Math.round(x)}, ${Math.round(y)})`);
      handleLongPress(_fingerDown.x, _fingerDown.y);
    }
  }, LONG_PRESS_MS);
}

function onFingerMove(x, y) {
  if (!_fingerDown) return;

  // Check drift
  const dx = x - _fingerDown.x;
  const dy = y - _fingerDown.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > MAX_DRIFT_PX) {
    // Too much movement -- not a long press
    cancelLongPress();
  }
}

function onFingerUp(x, y) {
  // Cancel any pending long press (finger lifted before threshold)
  cancelLongPress();
}

function cancelLongPress() {
  if (_longPressTimer) {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
  }
  _fingerDown = null;
}

// --- Long press action ---

async function handleLongPress(x, y) {
  cancelLongPress(); // Prevent re-entry

  try {
    // Get current note context
    const [fpResult, pnResult] = await Promise.all([
      PluginCommAPI.getCurrentFilePath(),
      PluginCommAPI.getCurrentPageNum(),
    ]);
    const filePath = fpResult?.result || '';
    const pageNum = pnResult?.result ?? 0;

    if (!filePath) {
      log('Gesture', 'No active note, ignoring long press');
      return;
    }

    log('Gesture', `Scanning page ${pageNum} of ${filePath} for links at (${Math.round(x)}, ${Math.round(y)})`);

    // Get all elements on the page
    const elemResult = await PluginFileAPI.getElements(pageNum, filePath);
    if (!elemResult?.success || !elemResult.result) {
      log('Gesture', `getElements failed: ${JSON.stringify(elemResult)}`);
      return;
    }

    const elements = elemResult.result;

    // Find supertask:// link elements
    const stLinks = elements.filter(
      (el) => el.type === 600 && el.link?.destPath?.startsWith('supertask://task/')
    );

    if (stLinks.length === 0) {
      log('Gesture', 'No supertask links on this page');
      recycleAll(elements);
      return;
    }

    log('Gesture', `Found ${stLinks.length} supertask links, hit-testing...`);

    // Try to find the link at the touch point
    let matchedLink = null;

    for (const el of stLinks) {
      const link = el.link;
      // Check if link has usable bounds
      if (link.width > 0 && link.height > 0) {
        const left = link.X - HIT_PADDING_PX;
        const top = link.Y - HIT_PADDING_PX;
        const right = link.X + link.width + HIT_PADDING_PX;
        const bottom = link.Y + link.height + HIT_PADDING_PX;

        log('Gesture', `Link bounds: (${link.X},${link.Y}) ${link.width}x${link.height}, touch: (${Math.round(x)},${Math.round(y)})`);

        if (x >= left && x <= right && y >= top && y <= bottom) {
          matchedLink = el;
          break;
        }
      }
    }

    // Fallback: if no hit-test match (bounds may be 0 for stroke links)
    if (!matchedLink) {
      if (stLinks.length === 1) {
        // Only one link on the page -- assume that's the target
        matchedLink = stLinks[0];
        log('Gesture', 'No hit-test match, using only supertask link on page');
      } else {
        log('Gesture', `No hit-test match among ${stLinks.length} links`);
        // Multiple links, can't determine which one -- open to This Page tab
        global.__superTaskDeepLink = {action: 'this-page'};
        recycleAll(elements);
        openPluginView();
        return;
      }
    }

    // Extract task ID from the matched link
    const taskId = matchedLink.link.destPath.replace('supertask://task/', '');
    log('Gesture', `Matched task: ${taskId}`);

    recycleAll(elements);

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
    log('Gesture', 'Calling showPluginView()...');
    const result = await PluginManager.showPluginView();
    log('Gesture', `showPluginView result: ${result}`);
  } catch (e) {
    log('Gesture', `showPluginView failed: ${e.message}`);
  }
}
