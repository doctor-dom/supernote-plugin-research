/**
 * Temp Link Navigation -- cross-note navigation via a temporary page.
 *
 * Inserts a new page after the current one with a centered navigation link
 * and explanatory text. On next plugin open, removes the entire temp page.
 *
 * NOTE: This is a workaround until Ratta exposes a direct note-open API.
 * TODO: Replace with direct navigation API when available.
 */

import {
  PluginNoteAPI,
  PluginFileAPI,
  PluginCommAPI,
} from 'sn-plugin-lib';
import RNFS from 'react-native-fs';
import {log, logError} from './debug';

const REGISTRY_DIR = '/storage/emulated/0/MyStyle/SuperTask';
const PENDING_FILE = REGISTRY_DIR + '/pending-temp-link.json';

// Marker so we can identify our temp link if page removal fails
const TEMP_LINK_MARKER = '[ST-NAV]';

/**
 * Save pending temp link info to disk for cleanup later.
 */
async function savePending(info) {
  try {
    const dirExists = await RNFS.exists(REGISTRY_DIR);
    if (!dirExists) await RNFS.mkdir(REGISTRY_DIR);
    await RNFS.writeFile(PENDING_FILE, JSON.stringify(info), 'utf8');
    log('TempLink', `Saved pending: ${JSON.stringify(info)}`);
  } catch (e) {
    logError('TempLink', e);
  }
}

/**
 * Read pending temp link info (does not delete the file).
 */
async function readPending() {
  try {
    const exists = await RNFS.exists(PENDING_FILE);
    if (!exists) return null;
    const raw = await RNFS.readFile(PENDING_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    log('TempLink', `No pending link or read error: ${e.message}`);
    return null;
  }
}

/**
 * Clear the pending file after successful cleanup.
 */
async function clearPending() {
  try {
    const exists = await RNFS.exists(PENDING_FILE);
    if (exists) await RNFS.unlink(PENDING_FILE);
  } catch (e) {
    // non-fatal
  }
}

/**
 * Create a temp navigation page after the current page with a centered link.
 *
 * @param {string} targetPath - Full path to the target .note file
 * @param {number} targetPage - Page number in target note (0-indexed)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function createTempLink(targetPath, targetPage = 0) {
  try {
    // Get current context
    const [fpResult, pageResult] = await Promise.all([
      PluginCommAPI.getCurrentFilePath(),
      PluginCommAPI.getCurrentPageNum(),
    ]);

    const sourcePath = fpResult?.result;
    const sourcePage = pageResult?.result;

    if (!sourcePath) {
      return {success: false, error: 'Could not get current file path'};
    }

    log('TempLink', `Creating temp nav page: ${sourcePath} p.${sourcePage} -> ${targetPath} p.${targetPage}`);

    // Save current note before any file-level operations
    await PluginNoteAPI.saveCurrentNote();

    // Get the current page's template for the new page
    let templateName = 'blank';
    try {
      const tplResult = await PluginFileAPI.getNotePageTemplate(sourcePath, sourcePage);
      if (tplResult?.success && tplResult.result?.name) {
        templateName = tplResult.result.name;
      }
      log('TempLink', `Page template: ${templateName}`);
    } catch (e) {
      log('TempLink', `Template lookup failed, using blank: ${e.message}`);
    }

    // Insert new page after current page
    const newPage = sourcePage + 1;
    const insertPageResult = await PluginFileAPI.insertNotePage({
      notePath: sourcePath,
      page: sourcePage,
      template: templateName,
    });

    log('TempLink', `insertNotePage result: ${JSON.stringify(insertPageResult)}`);

    if (!insertPageResult?.success) {
      return {
        success: false,
        error: `insertNotePage failed: ${insertPageResult?.error?.message || 'unknown'}`,
      };
    }

    // Get page size for centering
    let pageWidth = 1404;
    let pageHeight = 1872;
    try {
      const sizeResult = await PluginFileAPI.getPageSize(sourcePath, newPage);
      if (sizeResult?.success && sizeResult.result) {
        pageWidth = sizeResult.result.width || pageWidth;
        pageHeight = sizeResult.result.height || pageHeight;
      }
    } catch (e) {
      log('TempLink', `getPageSize failed, using defaults: ${e.message}`);
    }

    // Now place the link on the new page using insertTextLink.
    // insertTextLink works on the "current" in-memory page, but after
    // insertNotePage + save/reload, the current page hasn't changed.
    // So we save, reload to pick up the new page, then insert the link
    // via insertElements (file-level API that targets any page).

    // Build the link text
    const targetFilename = targetPath.split('/').pop().replace('.note', '');

    // Center the link on the page
    const linkWidth = 800;
    const linkHeight = 60;
    const linkLeft = Math.round((pageWidth - linkWidth) / 2);
    const linkTop = Math.round(pageHeight / 2 - 80);

    // Create the text link on the new page
    // We'll use insertTextLink after reloading onto the new page... but we can't
    // navigate there programmatically. Instead, use insertTextLink on current page
    // which goes into in-memory state, but target the file with save.
    //
    // Actually: insertTextLink always inserts on the current viewed page.
    // Since we can't switch pages, we'll construct the link element manually
    // and use insertElements on the new page (file-level API).

    const linkElement = await PluginCommAPI.createElement(600);
    if (!linkElement?.success || !linkElement.result) {
      log('TempLink', `createElement(600) failed: ${JSON.stringify(linkElement)}`);
      // Rollback: remove the page we just inserted
      await PluginFileAPI.removeNotePage(sourcePath, newPage);
      return {success: false, error: 'Failed to create link element'};
    }

    const el = linkElement.result;
    el.type = 600;
    el.link = {
      category: 0,       // text link
      X: linkLeft,
      Y: linkTop,
      width: linkWidth,
      height: linkHeight,
      page: newPage,
      style: 1,           // solid border (prominent)
      linkType: 1,        // jump to note file
      destPath: targetPath,
      destPage: targetPage,
      fontSize: 28,
      fullText: `${TEMP_LINK_MARKER} ${targetFilename}`,
      showText: targetFilename,
      italic: 0,
      controlTrailNums: [],
    };

    const insertResult = await PluginFileAPI.insertElements(sourcePath, newPage, [el]);
    log('TempLink', `insertElements (link) result: ${JSON.stringify(insertResult)}`);

    // Also add explanatory text above and below the link
    const textAbove = await PluginCommAPI.createElement(500);
    if (textAbove?.success && textAbove.result) {
      const ta = textAbove.result;
      ta.type = 500;
      ta.textBox = {
        textContentFull: `${TEMP_LINK_MARKER} Tap the link below to jump to your task`,
        textRect: {
          left: linkLeft,
          top: linkTop - 120,
          right: linkLeft + linkWidth,
          bottom: linkTop - 20,
        },
        fontSize: 24,
        textAlign: 1,     // center
        textBold: 1,
        textItalics: 0,
        textFrameWidthType: 0,
        textFrameStyle: 0,
        textEditable: 1,  // locked
      };
      await PluginFileAPI.insertElements(sourcePath, newPage, [ta]);
    }

    const textBelow = await PluginCommAPI.createElement(500);
    if (textBelow?.success && textBelow.result) {
      const tb = textBelow.result;
      tb.type = 500;
      tb.textBox = {
        textContentFull: `${TEMP_LINK_MARKER} This page will be removed automatically`,
        textRect: {
          left: linkLeft,
          top: linkTop + linkHeight + 30,
          right: linkLeft + linkWidth,
          bottom: linkTop + linkHeight + 100,
        },
        fontSize: 20,
        textAlign: 1,     // center
        textBold: 0,
        textItalics: 1,
        textFrameWidthType: 0,
        textFrameStyle: 0,
        textEditable: 1,
      };
      await PluginFileAPI.insertElements(sourcePath, newPage, [tb]);
    }

    // Reload so the user sees the new page when they swipe
    await PluginCommAPI.reloadFile();

    // Save pending info for cleanup
    await savePending({
      sourcePath,
      tempPage: newPage,
      markerText: TEMP_LINK_MARKER,
      targetPath,
      createdAt: new Date().toISOString(),
    });

    log('TempLink', `Temp nav page created at p.${newPage}. User should go to next page.`);
    return {success: true, tempPage: newPage};

  } catch (e) {
    logError('TempLink', e);
    return {success: false, error: e.message};
  }
}

/**
 * Clean up any pending temp navigation page. Call on every plugin open.
 *
 * Removes the temp page via removeNotePage. If the page was already removed
 * (or the note doesn't exist), fails silently.
 */
export async function cleanupTempLink() {
  const pending = await readPending();
  if (!pending) return;

  const {sourcePath, tempPage, markerText} = pending;
  log('TempLink', `Cleanup: checking temp page ${tempPage} in ${sourcePath}`);

  try {
    // Verify the temp page still exists and has our marker
    const elemsResult = await PluginFileAPI.getElements(tempPage, sourcePath);
    if (!elemsResult?.success || !elemsResult.result) {
      log('TempLink', 'Cleanup: page not accessible, clearing pending');
      await clearPending();
      return;
    }

    const hasMarker = elemsResult.result.some(el => {
      const text = el.link?.fullText || el.textBox?.textContentFull || '';
      return text.includes(markerText);
    });

    if (!hasMarker) {
      log('TempLink', 'Cleanup: no marker found on page (already cleaned?), clearing pending');
      await clearPending();
      return;
    }

    // Remove the entire temp page
    const result = await PluginFileAPI.removeNotePage(sourcePath, tempPage);
    log('TempLink', `removeNotePage result: ${JSON.stringify(result)}`);

    if (result?.success) {
      await clearPending();
      // Reload if we're in the same note
      try {
        const fpResult = await PluginCommAPI.getCurrentFilePath();
        if (fpResult?.result === sourcePath) {
          await PluginCommAPI.reloadFile();
          log('TempLink', 'Reloaded after page removal');
        }
      } catch (e) {
        // non-fatal
      }
      log('TempLink', 'Cleanup complete (page removed)');
    } else {
      // Page removal failed -- try element-level cleanup as fallback
      log('TempLink', 'removeNotePage failed, trying element-level cleanup');
      const toDelete = [];
      for (const el of elemsResult.result) {
        const text = el.link?.fullText || el.textBox?.textContentFull || '';
        if (text.includes(markerText)) {
          toDelete.push(el.numInPage);
        }
      }
      if (toDelete.length > 0) {
        await PluginFileAPI.deleteElements(sourcePath, tempPage, toDelete);
      }
      await clearPending();
      log('TempLink', `Fallback cleanup: deleted ${toDelete.length} elements`);
    }
  } catch (e) {
    // Non-fatal -- link/page may already be gone
    log('TempLink', `Cleanup error (non-fatal): ${e.message}`);
    await clearPending();
  }
}
