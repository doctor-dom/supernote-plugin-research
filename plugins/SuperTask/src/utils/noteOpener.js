/**
 * NoteOpener - native module for cross-note navigation experiments.
 * Tries different Android Intent strategies to open a .note file in the editor.
 *
 * Strategies:
 *   0: Generic ACTION_VIEW (let Android resolve)
 *   1: Target NOTE app directly (com.ratta.supernote.note)
 *   2: File manager with CLEAR_TOP/NEW_TASK flags
 *   3: Data URI with wildcard MIME
 *   4: Target NOTE app alt package (com.ratta.supernote)
 *   5: Broadcast intent
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
  {id: 0, label: 'Generic VIEW'},
  {id: 1, label: 'NOTE app direct'},
  {id: 2, label: 'FileManager+flags'},
  {id: 3, label: 'Data URI wildcard'},
  {id: 4, label: 'NOTE app alt pkg'},
  {id: 5, label: 'Broadcast'},
];
