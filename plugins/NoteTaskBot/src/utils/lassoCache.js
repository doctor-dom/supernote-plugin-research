/**
 * Cache lasso elements at button-press time before the plugin UI opens.
 * getLassoElements() can return a stale selection if called after slow work.
 */

import {PluginCommAPI} from 'sn-plugin-lib';
import {log} from './debug';

export const LASSO_BUTTON_ID = 200;

export function lassoFingerprint(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return '';
  return elements
    .map(el => el.numInPage ?? '?')
    .sort((a, b) => String(a).localeCompare(String(b), undefined, {numeric: true}))
    .join(',');
}

export async function cacheLassoOnButtonPress(buttonId) {
  if (buttonId !== LASSO_BUTTON_ID) return;
  try {
    const lasso = await PluginCommAPI.getLassoElements();
    global.__noteTaskBotLassoCache = lasso;
    const count = lasso?.result?.length ?? 0;
    const fp = count ? lassoFingerprint(lasso.result) : 'none';
    log('Lasso', `Cached on button press: ${count} elements [${fp}]`);
  } catch (e) {
    global.__noteTaskBotLassoCache = null;
    log('Lasso', `Cache on button press failed: ${e.message}`);
  }
}

export function consumeCachedLasso() {
  const cached = global.__noteTaskBotLassoCache ?? null;
  global.__noteTaskBotLassoCache = null;
  return cached;
}
