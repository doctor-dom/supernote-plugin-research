import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/// UI utility class for Android side
export interface Spec extends TurboModule {
  // Show error tip dialog
  showErrorTipDialog(tag: string): void;

  showRattaDialog(tip:string, letBtnTxt:string, rightBtnTxt:string, isSuccess:boolean):Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeUIUtils');
