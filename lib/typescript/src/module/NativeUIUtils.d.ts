import type { TurboModule } from 'react-native';
export interface Spec extends TurboModule {
    showErrorTipDialog(tag: string): void;
    showRattaDialog(tip: string, letBtnTxt: string, rightBtnTxt: string, isSuccess: boolean): Promise<boolean>;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeUIUtils.d.ts.map