/**
 * Build Todoist description links back to the source Supernote file.
 *
 * Supernote Partner / Cloud use cloud-relative paths like "Note/foo.note"
 * (matching the folder structure synced from the device). There is no
 * documented public deep-link URL that opens a specific file in Partner
 * on Android or desktop — see README "Source file links".
 *
 * This module stores the cloud path + device path in the task description
 * and optionally applies a user-configured link template if one is discovered.
 */

import {loadConfig} from './config';
import {log} from './debug';

const DEVICE_ROOT = '/storage/emulated/0/';

/**
 * Map a device absolute path to the cloud-relative path Partner/Cloud use.
 * e.g. /storage/emulated/0/Note/MyFile.note -> Note/MyFile.note
 */
export function devicePathToCloudPath(filePath) {
  if (!filePath) return '';
  let path = filePath.replace(/\\/g, '/');
  if (path.startsWith(DEVICE_ROOT)) {
    path = path.slice(DEVICE_ROOT.length);
  } else if (path.startsWith('/')) {
    path = path.slice(1);
  }
  return path;
}

function applyTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Build link variables for template substitution.
 */
export function buildLinkVars(noteContext) {
  const filePath = noteContext?.filePath || '';
  const pageNum = noteContext?.pageNum ?? 0;
  const cloudPath = devicePathToCloudPath(filePath);
  const filename = filePath.split('/').pop() || cloudPath.split('/').pop() || 'file';
  return {
    cloudPath,
    encodedCloudPath: encodeURIComponent(cloudPath),
    page: pageNum,
    filename,
    devicePath: filePath,
    encodedDevicePath: encodeURIComponent(filePath),
  };
}

/**
 * Build an on-device SuperTask deep link (works on the tablet via SuperTask,
 * not in Todoist on phone/PC unless the OS routes custom schemes).
 */
export function buildSupertaskNoteUrl(noteContext) {
  const vars = buildLinkVars(noteContext);
  if (!vars.devicePath) return '';
  return `supertask://note?path=${vars.encodedDevicePath}&page=${vars.page}`;
}

/**
 * Build optional Partner link from user-configured template.
 * Template placeholders: {cloudPath}, {encodedCloudPath}, {page}, {filename},
 * {devicePath}, {encodedDevicePath}
 */
export async function buildPartnerUrl(noteContext) {
  const config = await loadConfig();
  const template = (config.partnerLinkTemplate || '').trim();
  if (!template || !noteContext?.filePath) return null;
  const vars = buildLinkVars(noteContext);
  const url = applyTemplate(template, vars);
  log('PartnerLink', `Built partner URL: ${url}`);
  return url || null;
}

/**
 * Build the description footer appended to captured tasks.
 */
export async function buildNoteReferenceBlock(noteContext) {
  if (!noteContext?.filePath) return '';

  const vars = buildLinkVars(noteContext);
  const lines = ['', '---'];

  const partnerUrl = await buildPartnerUrl(noteContext);
  if (partnerUrl) {
    const label = vars.cloudPath.includes('.pdf')
      ? `Open ${vars.filename} in Supernote Partner`
      : `Open ${vars.filename} (page ${vars.page}) in Supernote Partner`;
    lines.push(`[${label}](${partnerUrl})`);
  }

  // Cloud path is what Partner/Cloud use internally — useful even without a deep link.
  lines.push(`Supernote path: ${vars.cloudPath} page ${vars.page}`);

  // Machine-readable back-reference for SuperTask "View Note" on device.
  lines.push(`[SuperTask] Captured from: ${vars.devicePath} p.${vars.page}`);

  if (!partnerUrl) {
    lines.push(
      '_(No Partner deep link configured. Open Supernote Partner and navigate to the path above, or set partnerLinkTemplate in SuperTask settings if you discover a working URL format.)_',
    );
  }

  return lines.join('\n');
}

/**
 * Async wrapper used by task creation screens.
 */
export async function buildCaptureDescription(noteContext) {
  return {
    block: await buildNoteReferenceBlock(noteContext),
    cloudPath: buildLinkVars(noteContext).cloudPath,
  };
}
