/**
 * SmartGestures — Phase 1b: scribble-to-delete
 *
 * Realtime gesture detection running in the background (showType: 0).
 * Listens for event_pen_up, classifies the just-drawn stroke, and if it
 * looks like a scribble/scratch-out over existing ink, deletes the
 * underlying strokes via deleteElements().
 *
 * All detection and overlap logic works in EMR coordinates (the native
 * digitizer space), avoiding unnecessary conversions.
 *
 * Diagnostics: "Gesture Probe" stamps a one-line summary; "Dump PNG"
 * renders full stroke history and saves to the export directory.
 */

import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

import {
  PluginManager,
  PluginFileAPI,
  PluginNoteAPI,
  PluginCommAPI,
  FileUtils,
  PointUtils,
  EventType,
  Element,
} from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

// -------------------------------------------------------------------------
// Diagnostic counters
// -------------------------------------------------------------------------
const stats = {
  penUps: 0,
  gesturesDetected: 0,
  strokesErased: 0,
  lastError: '',
};

const HISTORY_LIMIT = 20;
const MIN_POINTS_FOR_HISTORY = 5;
const strokeHistory = [];
let droppedTinyCount = 0;
let lastPageSizeStr = '?';
let lastPayloadNum = -1;
let lastElementNum = -1;
let sameElementRepeatCount = 0;
let distinctNumCount = 0;
let penUpChain = Promise.resolve();
let stampIndex = 0;
// Cached page context — these don't change during a session and
// fetching them on every pen_up is wasted round-trips.
let cachedPageSize = null;
let cachedNotePath = null;
let cachedPage = null;

// -------------------------------------------------------------------------
// Geometry helpers (all in EMR coordinates)
// -------------------------------------------------------------------------
function computeBoundingBox(points) {
  if (!points || points.length === 0) {
    return {minX: 0, minY: 0, maxX: 0, maxY: 0};
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {minX, minY, maxX, maxY};
}

// Compute arc (path) length of the polyline.
function arcLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// Count combined X+Y direction inversions using stride-2 comparison.
// Comparing point[i-2]→point[i-1] vs point[i-1]→point[i] naturally
// filters pen jitter without an arbitrary distance threshold.
function countInversions(points) {
  if (!points || points.length < 3) return 0;
  let inversions = 0;
  const NOISE = 2;
  for (let i = 2; i < points.length; i++) {
    const prevDx = points[i - 1].x - points[i - 2].x;
    const currDx = points[i].x - points[i - 1].x;
    if (
      Math.abs(currDx) > NOISE &&
      Math.abs(prevDx) > NOISE &&
      Math.sign(currDx) !== Math.sign(prevDx)
    ) {
      inversions += 1;
    }
    const prevDy = points[i - 1].y - points[i - 2].y;
    const currDy = points[i].y - points[i - 1].y;
    if (
      Math.abs(currDy) > NOISE &&
      Math.abs(prevDy) > NOISE &&
      Math.sign(currDy) !== Math.sign(prevDy)
    ) {
      inversions += 1;
    }
  }
  return inversions;
}

// Classify a stroke as a scribble/scratch-out gesture.
// Requires BOTH high density (path >> diagonal) AND many direction
// changes. Requiring both prevents false positives from either signal
// alone (dense cursive, or a simple zigzag that doesn't retrace).
function isScribble(points, bbox) {
  if (!points || points.length < 30) return false;
  const w = bbox.maxX - bbox.minX;
  const h = bbox.maxY - bbox.minY;
  const diag = Math.sqrt(w * w + h * h);
  if (diag < 200) return false;
  // In EMR, axes are rotated vs screen: EMR X = screen Y (height),
  // EMR Y = screen X (width). A flat/wide scratch-out on screen has
  // EMR h > w (h/w >= 1.3). Normal handwriting lines have h/w ~ 0.8.
  // This filters out long connected handwriting that happens to have
  // high density and inversions.
  if (h / Math.max(w, 1) < 1.3) return false;
  const arc = arcLength(points);
  const density = diag > 0 ? arc / diag : 0;
  if (density <= 2.5) return false;
  const inv = countInversions(points);
  return inv > 6;
}

// Get real bounding box of a stroke by reading its points.
async function getStrokeBounds(el) {
  if (!el || !el.stroke) return null;
  try {
    const size = await el.stroke.points.size();
    if (!size || size <= 0) return null;
    const raw = await el.stroke.points.getRange(0, size);
    return computeBoundingBox(raw);
  } catch (e) {
    return null;
  }
}

// Check if target bbox is fully contained inside scribble bbox + margin,
// AND that the scribble covers a significant fraction of the target's
// extent. The coverage check prevents deleting a long stroke (e.g. a
// full sentence written without lifting the pen) when the scribble only
// crosses a small part of it.
function isContainedWithMargin(scribbleBbox, targetBbox) {
  const MARGIN = 150;
  if (
    targetBbox.minX < scribbleBbox.minX - MARGIN ||
    targetBbox.maxX > scribbleBbox.maxX + MARGIN ||
    targetBbox.minY < scribbleBbox.minY - MARGIN ||
    targetBbox.maxY > scribbleBbox.maxY + MARGIN
  ) {
    return false;
  }
  // Coverage: the scribble should span at least 60% of the target's
  // larger dimension. This prevents a narrow scribble from deleting a
  // sentence-length stroke.
  const targetW = targetBbox.maxX - targetBbox.minX || 1;
  const targetH = targetBbox.maxY - targetBbox.minY || 1;
  const scribbleW = scribbleBbox.maxX - scribbleBbox.minX;
  const scribbleH = scribbleBbox.maxY - scribbleBbox.minY;
  const coverageX = Math.min(scribbleW / targetW, 1);
  const coverageY = Math.min(scribbleH / targetH, 1);
  const coverage = Math.max(coverageX, coverageY);
  return coverage >= 0.6;
}

function recordSnap(snap) {
  if (snap.pts >= 0 && snap.pts < MIN_POINTS_FOR_HISTORY) {
    droppedTinyCount += 1;
    return;
  }
  strokeHistory.push(snap);
  while (strokeHistory.length > HISTORY_LIMIT) strokeHistory.shift();
}

// -------------------------------------------------------------------------
// Pen-up handler
// -------------------------------------------------------------------------
async function handlePenUp(data) {
  stats.penUps += 1;

  let payloadNum = -1;
  if (data) {
    try {
      if (Array.isArray(data) && data.length > 0) {
        payloadNum = data[0].numInPage;
      } else if (Array.isArray(data.elements) && data.elements.length > 0) {
        payloadNum = data.elements[0].numInPage;
      } else if (typeof data.numInPage === 'number') {
        payloadNum = data.numInPage;
      }
    } catch (e) {
      // fall through
    }
  }
  if (payloadNum >= 0 && payloadNum === lastPayloadNum) {
    sameElementRepeatCount += 1;
    return;
  }
  if (payloadNum >= 0) lastPayloadNum = payloadNum;

  try {
    const snap = {
      seq: stats.penUps,
      num: -1,
      payloadNum,
      type: -998,
      pts: -1,
      w: -1,
      h: -1,
      inv: -1,
      arc: -1,
      density: -1,
      bail: '',
    };

    const lastResp = await PluginFileAPI.getLastElement();
    const gesture = lastResp && lastResp.result;
    snap.type = gesture ? gesture.type : -998;
    snap.num = gesture ? gesture.numInPage : -1;

    if (gesture && gesture.numInPage === lastElementNum) {
      sameElementRepeatCount += 1;
      return;
    }
    if (gesture) {
      distinctNumCount += 1;
      lastElementNum = gesture.numInPage;
    }

    if (!gesture || gesture.type !== Element.TYPE_STROKE || !gesture.stroke) {
      snap.bail = 'not-stroke';
      recordSnap(snap);
      return;
    }

    const pointCount = await gesture.stroke.points.size();
    snap.pts = pointCount;
    // Bail before the expensive getRange if we know isScribble will
    // reject (requires >= 30 points).
    if (pointCount < 30) {
      snap.bail = pointCount < 5 ? 'few-points' : 'short-stroke';
      recordSnap(snap);
      return;
    }
    const rawPoints = await gesture.stroke.points.getRange(0, pointCount);
    const emrBbox = computeBoundingBox(rawPoints);

    const emrW = emrBbox.maxX - emrBbox.minX;
    const emrH = emrBbox.maxY - emrBbox.minY;
    const diag = Math.sqrt(emrW * emrW + emrH * emrH);
    const arc = arcLength(rawPoints);
    const inv = countInversions(rawPoints);

    snap.w = Math.round(emrW);
    snap.h = Math.round(emrH);
    snap.inv = inv;
    snap.arc = Math.round(arc);
    snap.density = diag > 0 ? Math.round((arc / diag) * 10) / 10 : 0;

    if (!isScribble(rawPoints, emrBbox)) {
      snap.bail = 'not-scribble';
      recordSnap(snap);
      return;
    }

    // Fetch page context — cache it so subsequent scribbles skip these
    // round-trips entirely.
    if (cachedNotePath == null || cachedPage == null) {
      const pageResp = await PluginCommAPI.getCurrentPageNum();
      const pathResp = await PluginCommAPI.getCurrentFilePath();
      cachedPage = pageResp && pageResp.result;
      cachedNotePath = pathResp && pathResp.result;
    }
    const page = cachedPage;
    const notePath = cachedNotePath;
    if (page == null || !notePath) {
      snap.bail = 'no-page';
      recordSnap(snap);
      return;
    }

    if (!cachedPageSize) {
      const sizeResp = await PluginFileAPI.getPageSize(notePath, page);
      cachedPageSize = sizeResp && sizeResp.result;
      if (cachedPageSize) {
        lastPageSizeStr = cachedPageSize.width + 'x' + cachedPageSize.height;
      }
    }

    snap.bail = 'passed-classify';
    recordSnap(snap);

    // Find strokes whose real bbox is fully contained in the scribble's
    // bbox (with margin). Read real points per candidate.
    const all = await PluginFileAPI.getElements(page, notePath);
    const elements = (all && all.result) || [];

    const toDelete = [gesture.numInPage];
    for (const el of elements) {
      if (el.numInPage === gesture.numInPage) continue;
      if (el.type !== Element.TYPE_STROKE) continue;
      const targetBbox = await getStrokeBounds(el);
      if (!targetBbox) continue;
      if (isContainedWithMargin(emrBbox, targetBbox)) {
        toDelete.push(el.numInPage);
      }
    }

    // Safety cap: if we'd erase more than half the page, something is
    // wrong — abort rather than nuke.
    const strokeCount = elements.filter(
      (el) => el.type === Element.TYPE_STROKE,
    ).length;
    if (toDelete.length > Math.max(strokeCount * 0.5, 5)) {
      snap.bail = 'safety-cap(' + toDelete.length + '/' + strokeCount + ')';
      console.log('[SmartGestures] safety cap: would erase ' + toDelete.length +
        ' of ' + strokeCount + ' strokes — aborting');
      return;
    }

    if (toDelete.length <= 1) {
      snap.bail = 'no-targets';
      return;
    }

    // Pre-save required — without it, deleteElements operates on stale
    // on-disk state and the page reverts. Confirmed in v0.1.0 testing.
    await PluginNoteAPI.saveCurrentNote();
    await PluginFileAPI.deleteElements(notePath, page, toDelete);

    const erased = toDelete.length - 1;
    stats.gesturesDetected += 1;
    stats.strokesErased += erased;
    console.log('[SmartGestures] erased ' + erased + ' stroke(s)');
  } catch (err) {
    stats.lastError = (err && err.message) || String(err);
    console.log('[SmartGestures] handlePenUp error: ' + stats.lastError);
  }
}

// -------------------------------------------------------------------------
// Wiring
// -------------------------------------------------------------------------
PluginManager.registerEventListener(EventType.PEN_UP, 1, {
  onMsg: (data) => {
    penUpChain = penUpChain.then(() => handlePenUp(data)).catch((err) => {
      stats.lastError = 'chain:' + ((err && err.message) || String(err));
    });
  },
});

function resetStats() {
  stats.penUps = 0;
  stats.gesturesDetected = 0;
  stats.strokesErased = 0;
  stats.lastError = '';
  strokeHistory.length = 0;
  stampIndex = 0;
  droppedTinyCount = 0;
  lastPayloadNum = -1;
  lastElementNum = -1;
  sameElementRepeatCount = 0;
  distinctNumCount = 0;
  cachedPageSize = null;
  cachedNotePath = null;
  cachedPage = null;
}

PluginManager.registerButtonListener({
  onButtonPress: async (msg) => {
    if (!msg) return;
    if (msg.id === 101) {
      resetStats();
      await PluginNoteAPI.insertText({
        textContentFull: 'SmartGestures: stats reset',
        textRect: {left: 50, top: 50, right: 900, bottom: 130},
        fontSize: 26,
        textBold: 1,
        textAlign: 0,
        textItalics: 0,
        textFrameWidthType: 1,
        textFrameStyle: 0,
        textEditable: 1,
      });
      return;
    }
    if (msg.id === 102) {
      await dumpFullHistory();
      return;
    }
    if (msg.id !== 100) return;

    const LINE_H = 56;
    const FONT_SIZE = 22;
    const most = strokeHistory.length
      ? strokeHistory[strokeHistory.length - 1]
      : null;

    const summary =
      'ups:' + stats.penUps +
      ' dist:' + distinctNumCount +
      ' rep:' + sameElementRepeatCount +
      ' drop:' + droppedTinyCount +
      ' g:' + stats.gesturesDetected +
      ' er:' + stats.strokesErased +
      ' ps:' + lastPageSizeStr +
      (most
        ? ' | last #' + most.seq +
          ' num:' + most.num +
          ' pts:' + most.pts +
          ' inv:' + most.inv +
          ' d:' + most.density +
          ' b:' + most.bail
        : ' | no-history');

    const top = 30 + stampIndex * LINE_H;
    stampIndex += 1;

    console.log('[SmartGestures] ' + summary);
    try {
      await PluginNoteAPI.insertText({
        textContentFull: summary,
        textRect: {left: 20, top, right: 1384, bottom: top + LINE_H - 4},
        fontSize: FONT_SIZE,
        textBold: 1,
        textAlign: 0,
        textItalics: 0,
        textFrameWidthType: 1,
        textFrameStyle: 0,
        textEditable: 1,
      });
    } catch (err) {
      stats.lastError = (err && err.message) || String(err);
    }
  },
});

// -------------------------------------------------------------------------
// Dump-to-PNG
// -------------------------------------------------------------------------
async function dumpFullHistory() {
  try {
    const frozenHistory = strokeHistory.slice();
    frozenHistory.sort((a, b) => a.seq - b.seq);
    const frozenCounters = {
      ups: stats.penUps,
      dist: distinctNumCount,
      rep: sameElementRepeatCount,
      drop: droppedTinyCount,
      g: stats.gesturesDetected,
      er: stats.strokesErased,
    };

    const pageResp = await PluginCommAPI.getCurrentPageNum();
    const pathResp = await PluginCommAPI.getCurrentFilePath();
    const page = pageResp && pageResp.result;
    const notePath = pathResp && pathResp.result;
    if (page == null || !notePath) return;

    const LINE_H = 40;
    const lines = [];
    lines.push(
      'DUMP @ ups:' + frozenCounters.ups +
      ' dist:' + frozenCounters.dist +
      ' rep:' + frozenCounters.rep +
      ' drop:' + frozenCounters.drop +
      ' g:' + frozenCounters.g +
      ' er:' + frozenCounters.er +
      ' ps:' + lastPageSizeStr,
    );
    frozenHistory.forEach((s) => {
      lines.push(
        '#' + s.seq +
        ' num:' + s.num +
        ' pts:' + s.pts +
        ' w:' + s.w +
        ' h:' + s.h +
        ' inv:' + s.inv +
        ' arc:' + s.arc +
        ' d:' + s.density +
        ' b:' + s.bail,
      );
    });

    const dumpTop = 30 + stampIndex * 56 + 40;
    stampIndex += 1;
    for (let i = 0; i < lines.length; i++) {
      const top = dumpTop + i * LINE_H;
      await PluginNoteAPI.insertText({
        textContentFull: lines[i],
        textRect: {left: 20, top, right: 1384, bottom: top + LINE_H - 4},
        fontSize: 20,
        textBold: i === 0 ? 1 : 0,
        textAlign: 0,
        textItalics: 0,
        textFrameWidthType: 1,
        textFrameStyle: 0,
        textEditable: 1,
      });
    }
    await PluginNoteAPI.saveCurrentNote();

    const exportDir = await FileUtils.getExportPath();
    const ts = Date.now();
    const pngPath = exportDir + '/smartgestures_debug_' + ts + '.png';
    const genResp = await PluginFileAPI.generateNotePng({
      notePath,
      page,
      times: 1,
      pngPath,
      type: 0,
    });

    const ok = genResp && genResp.success;
    const confirmTop = dumpTop + lines.length * LINE_H + 10;
    await PluginNoteAPI.insertText({
      textContentFull:
        (ok ? 'PNG saved: ' : 'PNG FAIL: ') + pngPath +
        (ok ? '' : ' | ' + JSON.stringify(genResp && genResp.error)),
      textRect: {left: 20, top: confirmTop, right: 1384, bottom: confirmTop + 60},
      fontSize: 18,
      textBold: 1,
      textAlign: 0,
      textItalics: 0,
      textFrameWidthType: 1,
      textFrameStyle: 0,
      textEditable: 1,
    });
  } catch (err) {
    stats.lastError = 'dump:' + ((err && err.message) || String(err));
  }
}

PluginManager.registerButton(1, ['NOTE'], {
  id: 100,
  name: 'Gesture Probe',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  showType: 0,
});

PluginManager.registerButton(1, ['NOTE'], {
  id: 101,
  name: 'Reset Stats',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  showType: 0,
});

PluginManager.registerButton(1, ['NOTE'], {
  id: 102,
  name: 'Dump PNG',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  showType: 0,
});
