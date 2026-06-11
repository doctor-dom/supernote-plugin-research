/**
 * Place a success checkbox marker on the note near the lasso selection.
 */

import {Image} from 'react-native';
import RNFS from 'react-native-fs';
import {PluginCommAPI, PluginNoteAPI} from 'sn-plugin-lib';
import {log} from './debug';

const CHECKBOX_ASSET = require('../../assets/checkbox-done.png');

const MARK_DIR = '/storage/emulated/0/MyStyle/NoteTaskBot';
const MARK_PNG = MARK_DIR + '/checkbox-done.png';

function markRect(bounds) {
  const size = 32;
  const left = Math.max(0, bounds.left - size - 8);
  const top = bounds.top;
  return {left, top, right: left + size, bottom: top + size};
}

async function ensureCheckboxPng() {
  const dirExists = await RNFS.exists(MARK_DIR);
  if (!dirExists) await RNFS.mkdir(MARK_DIR);

  if (await RNFS.exists(MARK_PNG)) return MARK_PNG;

  const resolved = Image.resolveAssetSource(CHECKBOX_ASSET);
  const src = resolved?.uri || '';
  if (src.startsWith('file://')) {
    await RNFS.copyFile(src.replace('file://', ''), MARK_PNG);
    return MARK_PNG;
  }
  if (src && await RNFS.exists(src)) {
    await RNFS.copyFile(src, MARK_PNG);
    return MARK_PNG;
  }
  throw new Error('Could not resolve bundled checkbox PNG');
}

export async function markCaptureSuccess(bounds) {
  if (!bounds) {
    log('Mark', 'No bounds — skipping checkbox marker');
    return false;
  }

  const rect = markRect(bounds);
  log('Mark', `Checkbox rect: ${JSON.stringify(rect)}`);

  try {
    const pngPath = await ensureCheckboxPng();
    const lassoResult = await PluginCommAPI.lassoElements(rect);
    log('Mark', `lassoElements: ${JSON.stringify(lassoResult)}`);

    if (lassoResult?.success && lassoResult.result !== false) {
      const imgResult = await PluginNoteAPI.insertImage(pngPath);
      log('Mark', `insertImage: ${JSON.stringify(imgResult)}`);
      if (imgResult?.success) {
        await PluginNoteAPI.saveCurrentNote();
        return true;
      }
    }
  } catch (e) {
    log('Mark', `insertImage path failed: ${e.message}`);
  }

  try {
    await PluginNoteAPI.insertText({
      textContentFull: '\u2713',
      textRect: rect,
      fontSize: 22,
      textBold: 1,
      textFrameStyle: 3,
      textEditable: 1,
      textFrameWidthType: 1,
    });
    await PluginNoteAPI.saveCurrentNote();
    log('Mark', 'Fallback bordered checkmark inserted');
    return true;
  } catch (e) {
    log('Mark', `insertText fallback failed: ${e.message}`);
    return false;
  }
}
