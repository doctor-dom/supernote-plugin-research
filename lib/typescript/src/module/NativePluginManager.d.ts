import type { TurboModule } from 'react-native';
export interface Spec extends TurboModule {
    onMounted(): void;
    onStop(): void;
    getOrientation(): Promise<number>;
    getPluginDirPath(): Promise<string | null | undefined>;
    getPluginName(): Promise<string | null | undefined>;
    /**
     * Gets the device type.
     * 0:A5
     * 1:A6
     * 2:A6X
     * 3:A5X
     * 4:A6X2
     * 5:A5X2
     *  */
    getDeviceType(): Promise<number>;
    /**
    * Register button click
    * Registered buttons will appear in sidebar and lasso toolbar
    * @param {int} type menuItem type, 1: Sidebar button 2: Lasso toolbar button, 3: Document selection toolbar button
    * @param {string[]} appType App types the plugin button is registered for. Default is \"Note\". This is an array.
    * @param {Object} menuItem Button data, divided into sidebar and lasso toolbar data
    * Sidebar button data:
    * {
    * id: Button ID, unique and immutable, defined by plugin
    * name: Button name
    * color: Font color
    * icon: Button icon
    * bgColor: Background color
    * expandMenuItem: Whether to extend existing buttons, only for sidebar
    *  0: default, no extension, adds entry to sidebar
    *  1: pen
    *  2: eraser
    *  3: layer
    *  4: template
    *  5: thumbnail
    * }
    *
    * Lasso toolbar button data:
    * {
    * id: Button ID, unique and immutable, defined by plugin
    * name: Button name
    * color: Font color
    * icon: Button icon
    * bgColor: Background color
    * editDataTypes: List<Integer> Current lasso data types that show toolbar
    *   0: Handwritten strokes
    *   1: Title
    *   2: Image
    *   3: Text
    *   4: Link
    * isHideToolbar: Whether to hide toolbar after click
    * }
    * @param {Object|null|undefined} showData UI display data after button click, can be null
    * {
    * regionType: Plugin display area type
    *   0: No UI display needed
    *   1: Center dialog display
    *   2: Fullscreen display
    *   3: Fullscreen display, won't dismiss
    * regionWidth: Area width
    * regionHeight: Area height
    * }
    *
    */
    registerButtonRes(type: number, appTypes: string[], button: Object): Promise<boolean>;
    /**
     * @param {Object} button Button data, divided into sidebar and lasso toolbar data
     * Sidebar button data:
     * {
     * id: Button ID, unique and immutable, defined by plugin
     * name: Button name
     * color: Font color
     * icon: Button icon
     * bgColor: Background color
     * expandMenuItem: Whether to extend existing buttons, only for sidebar
     *  0: default, no extension, adds entry to sidebar
     *  1: pen
     *  2: eraser
     *  3: layer
     *  4: template
     *  5: thumbnail
     * }
     *
     * Lasso toolbar button data:
     * {
     * id: Button ID, unique and immutable, defined by plugin
     * name: Button name
     * color: Font color
     * icon: Button icon
     * bgColor: Background color
     * editDataTypes: List<Integer> Current lasso data types that show toolbar
     *   0: Handwritten strokes
     *   1: Title
     *   2: Image
     *   3: Text
     *   4: Link
     * isHideToolbar: Whether to hide toolbar after click
     * }
     * @param {Object|null|undefined} showData UI display data after button click, can be null
     * {
     * regionType: Plugin display area type
     *   0: No UI display needed
     *   1: Center dialog display
     *   2: Fullscreen display
     *   3: Fullscreen display, won't dismiss
     * regionWidth: Area width
     * regionHeight: Area height
     * }
    */
    modifyButtonRes(button: Object): Promise<boolean>;
    /**
    * Unregister button
    * @param {int} id Button ID
    */
    unregisterButtonRes(id: number): Promise<boolean>;
    /**
     * Gets whether a button is enabled.
     * @param {int} id Button ID.
     * @returns {boolean} Whether it is enabled.
     */
    getButtonState(id: number): Promise<boolean>;
    /**
     * Sets whether a button is enabled.
     * @param {int} id Button ID.
     * @param {boolean} enable Whether to enable it.
     */
    setButtonState(id: number, enable: boolean): Promise<boolean>;
    /**
    * Register config button
    * @param {Object} showData UI display data after button click, cannot be null:
    * {
    * regionType: Plugin display area type
    *   0: No UI display needed
    *   1: Center dialog display
    *   2: Fullscreen display
    *   3: Fullscreen display, won't dismiss
    * regionWidth: Area width
    * regionHeight: Area height
    * }
    */
    registerConfigButton(): Promise<boolean>;
    /**
     * Show plugin view
     */
    showPluginView(): Promise<boolean>;
    /**
    * Actively close plugin UI
    */
    closePluginView(): Promise<boolean>;
    invalidatePluginView(): void;
    normalize(text: string): Promise<string>;
    setFullAuto(enable: boolean): void;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativePluginManager.d.ts.map