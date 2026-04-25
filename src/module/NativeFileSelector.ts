import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/// Send messages to Android side
export interface Spec extends TurboModule {

  /**
   * Select image
   */
  selectImage(): Promise<string>;

  /**
   * Select file
   * @param {Object} params
   * Data structure:
   * {
   *  selectType: 0 - Normal file selection, 1 - Single file selection
   *  suffixList: List of file extensions
   *  maxNum: Maximum number of files that can be selected
   *  title: Center title
   *  rightButtonText: Top right button text
   *  selectPathList: Absolute paths of files to be selected by default
   *  needSelectFolder: Folder to navigate to
   *  limitPath: Restrict to specific folder, must be used with needSelectFolder
   * }
   */
  selectFile(params: Object): Promise<Array<string>|null|undefined>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('FileSelector');

