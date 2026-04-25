import { type PluginLifeListener } from './listener/PluginLifeListener';
import { type ButtonListener, type ButtonSubscription } from './listener/ButtonListener';
import { type ConfigButtonListener, type ConfigButtonSubscription } from './listener/ConfigButtonListener';
import { type PluginEventListener, type PluginEventSubscription } from './listener/PluginEventListener';
interface PluginLifeSub {
    id: number;
    listener: PluginLifeListener;
    remove: () => void;
}
declare const PluginManager: {
    init(): Promise<void>;
    addPluginLifeListener(listener: PluginLifeListener): PluginLifeSub;
    /**
     * Registers a button listener to receive plugin button click events.
     * @param {ButtonListener}buttonListener The button listener.
     * @returns {ButtonSubscription} A subscription handle that can be used to remove the listener.
     */
    registerButtonListener(buttonListener: ButtonListener): ButtonSubscription;
    /**
     * Registers a config-button listener to receive config button click events.
     * @param {ConfigButtonListener}buttonListener The config button listener.
     * @returns {ConfigButtonSubscription} A subscription handle that can be used to remove the listener.
     */
    registerConfigButtonListener(buttonListener: ConfigButtonListener): ConfigButtonSubscription;
    /**
     * Registers a language-change listener to receive system language updates.
     * @param {PluginEventListener}langListener The language event listener.
     * @returns {PluginEventSubscription} A subscription handle that can be used to remove the listener.
     */
    registerLangListener(langListener: PluginEventListener): PluginEventSubscription;
    /**
     * Registers a plugin event listener.
     * @param {string}event Event type. See {@link EventType}. Currently only `event_pen_up` is supported.
     * @param {number}registerType Registration order policy:
     * - 0: always first
     * - 1: normal ordering
     * - 2: always last
     *
     * When multiple plugins register the same event, callbacks are ordered by the registration policy above.
     * @param {PluginEventListener}penUpListener The event listener.
     * @throws Error Thrown when parameters are invalid.
     */
    registerEventListener(event: string, registerType: number, penUpListener: PluginEventListener): PluginEventSubscription;
    /**
     * Registers a plugin button.
     * - Validates `type`: must be 1 (sidebar), 2 (lasso toolbar), or 3 (document selection toolbar)
     * - Validates `appTypes`: must be a non-empty string array, and each item must be in {@link AppType}
     * - Deduplicates `appTypes` before passing to the native API
     * @param {number}type Button type: 1|2|3
     * @param {string[]}appTypes App types (values are 'NOTE' or 'DOC')
     * @param {PluginButton}button Button payload.
     * @throws Error Thrown when parameters are invalid.
     */
    registerButton(type: number, appTypes: string[], button: Object): Promise<boolean>;
    /**
     * Unregisters a plugin button.
     * @param id Unique button identifier.
     * @returns Promise<boolean> Whether the button was successfully unregistered.
     */
    unregisterButton(id: number): Promise<boolean>;
    /**
     * Gets a button's enabled state.
     * @param id Unique button identifier.
     * @returns Promise<boolean> Button state: true = enabled, false = disabled.
     */
    getButtonState(id: number): Promise<boolean>;
    /**
     * Sets a button's enabled state.
     * @param id Unique button identifier.
     * @param state Button state: true = enabled, false = disabled.
     * @returns Promise<boolean> Result of the operation.
     *
     * Notes:
     * - Validates parameters via verifyParams.
     * - `id` must be a non-negative integer, `state` must be a boolean.
     * - Invalid parameters throw immediately and prevent calling into the native layer.
     */
    setButtonState(id: number, state: boolean): Promise<boolean>;
    /**
     * Registers the plugin config button.
     * @returns Promise<boolean> Whether the config button was successfully registered.
     */
    registerConfigButton(): Promise<boolean>;
    /**
     * Gets the plugin directory path.
     * @returns Promise<string | null | undefined> Plugin directory path.
     */
    getPluginDirPath(): Promise<string | null | undefined>;
    /**
     * Gets the plugin name.
     * @returns Promise<string | null | undefined> Plugin name.
     */
    getPluginName(): Promise<string | null | undefined>;
    /**
     * Gets device type.
     * 0:A5
     * 1:A6
     * 2:A6X
     * 3:A5X
     * 4:A6X2
     * 5:A5X2
     * @returns Promise<number> Device type.
     */
    getDeviceType(): Promise<number>;
    /**
     * Closes the plugin view.
     * @returns Promise<boolean> Whether the plugin view was successfully closed.
     */
    closePluginView(): Promise<boolean>;
};
export default PluginManager;
//# sourceMappingURL=PluginManager.d.ts.map