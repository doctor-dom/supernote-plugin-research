import {PluginManager} from 'sn-plugin-lib';
import {setGestureEnabled} from './gestureDetector';
import {log} from './debug';

/**
 * Close the plugin view and re-enable gesture detection.
 * Every screen should call this instead of PluginManager.closePluginView().
 */
export function closePlugin() {
  setGestureEnabled(true);
  log('App', 'Gestures ON (view closing)');
  PluginManager.closePluginView();
}
