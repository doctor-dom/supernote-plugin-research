/**
 * NoteOpener - native module for cross-note navigation experiments.
 * All strategies use reactApplicationContext (bypasses HostContext interception).
 *
 * Strategies:
 *   0: content:// URI via FileProvider + generic ACTION_VIEW
 *   1: Target inbox FileManagerMainActivity + only_open_file (via reactCtx)
 *   2: Plain Uri.parse + only_open_file extra
 *   3: Target inbox package (no activity specified)
 */
import {NativeModules} from 'react-native';

const {NoteOpener} = NativeModules;

export async function openNote(path, strategy = 0) {
  if (!NoteOpener) {
    throw new Error('NoteOpener native module not available');
  }
  return await NoteOpener.openNote(path, strategy);
}

export const STRATEGIES = [
  {id: 0, label: 'ContentURI'},
  {id: 1, label: 'Inbox direct'},
  {id: 2, label: 'ParsedURI'},
  {id: 3, label: 'LaunchPkg'},
];
