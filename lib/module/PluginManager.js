"use strict";

import { DeviceEventEmitter } from 'react-native';
import NativePluginManager from './module/NativePluginManager';
import { AppType } from "./bean/PluginButton.js";
import { verifyParams } from "./sdk/utils/VerifyUtils.js";
import NativePluginAPI from './module/NativePluginAPI';
import { EventType } from "./event/PluginEvent.js";
import { transformElements } from "./model/Element.js";
const PluginLifeType = {
  start: 1,
  stop: 2
};
;
const pluginLifeEvent = "plugin_life";
// const pluginEventType = "event_type";

// const START_TYPE = "start_type";
// const LEFT = "left";
// const TOP = "top";
// const RIGHT = "right";
// const BOTTOM = "bottom";
// Button event listener
const PLUGIN_BUTTON_EVENT = "plugin_button_event";
const PLUGIN_CONFIG_EVENT = "plugin_config_event";
// Listen for language changes
const PLUGIN_EVENT_LANG = "plugin_event_lang";
const PLUGIN_EVENT = "plugin_event";
const PLUGIN_EVENT_TYPE = "type";
const PLUGIN_EVENT_DATA = "data";
var pluginTask = "plugin_task";
var taskId = 100011;
let lastPluginLifeMsg = null;
let pluginLifeListenerIdCount = 0;
const pluginLifeSubs = new Map();
/// Whether notification has been sent during listener addition
let addPluginLifeNotifyIds = null;

/// Timer to delay clearing lastMsg
var timeMsg = null;
let isInit = false;

/// Whether notification has been sent during listener addition
let addButtonNotifyIds = [];
// Last event received
var lastButtonEventMsg = null;
// Timer to delay clearing lastButtonEventMsg
var timeMenuEvent = null;
// Collection of button event listener subscriptions
const buttonEventSubscriptions = new Map();
// Counter for button listener subscription IDs
let buttonEventSubIdCount = 0;

/// Whether notification has been sent during listener addition
let addConfigNotifyIds = [];
// Last event received
var lastConfigEventMsg = null;
// Timer to delay clearing lastButtonEventMsg
var timeConfigEvent = null;
// Collection of button event listener subscriptions
const configSubscriptions = new Map();
// Counter for button listener subscription IDs
let configEventSubIdCount = 0;

// Last language change data received
// var lastLanEventMsg = null;
const langSubscriptions = new Map();
let langEventSubIdCount = 0;
let eventSubscriptions = new Map();

/// Callback task
async function PluginTask(data) {
  console.log("PluginTask run data:" + data);
  // Add menu button listener
  addButtonListener();
  addConfigButtonListener();
  addLangListener();
  DeviceEventEmitter.addListener(pluginLifeEvent, msg => {
    console.log("PluginTask msg:" + msg.life_state);
    console.log("PluginTask pluginLifeListenerIdCount:" + pluginLifeListenerIdCount);
    if (timeMsg != null && timeMsg != undefined) {
      clearTimeout(timeMsg);
    }
    addPluginLifeNotifyIds = null;
    lastPluginLifeMsg = msg;
    notifyAllPluginLife(msg);
    timeMsg = setTimeout(function () {
      lastPluginLifeMsg = null;
      timeMsg = null;
      addPluginLifeNotifyIds = null;
    }, 1000);
  });
}
;
const registerListener = async () => {
  console.log("registerListener");
  // Add menu button listener
  addButtonListener();
  addConfigButtonListener();
  addLangListener();
  addPluginEventListener();
  DeviceEventEmitter.addListener(pluginLifeEvent, msg => {
    console.log("PluginTask msg:" + msg.life_state);
    console.log("PluginTask pluginLifeListenerIdCount:" + pluginLifeListenerIdCount);
    if (timeMsg != null && timeMsg != undefined) {
      clearTimeout(timeMsg);
    }
    addPluginLifeNotifyIds = null;
    lastPluginLifeMsg = msg;
    notifyAllPluginLife(msg);
    timeMsg = setTimeout(function () {
      lastPluginLifeMsg = null;
      timeMsg = null;
      addPluginLifeNotifyIds = null;
    }, 1000);
  });
};
const addPluginEventListener = () => {
  DeviceEventEmitter.addListener(PLUGIN_EVENT, msg => {
    console.log("PluginEvent msg:" + msg);
    let eventSubscription = eventSubscriptions.get(msg.type);
    let data;
    if (msg.type == EventType.PEN_UP) {
      data = transformElements(msg.data);
    }
    if (eventSubscription != null) {
      eventSubscription.listener.onMsg(msg.data);
    }
  });
};

// Listen for language changes
const addLangListener = () => {
  console.log("addLangListener");
  DeviceEventEmitter.addListener(PLUGIN_EVENT_LANG, msg => {
    console.log("lang msg:" + msg);
    for (let [, value] of langSubscriptions) {
      value.listener.onMsg(msg);
    }
  });
};

// Add configuration button listener
const addConfigButtonListener = () => {
  DeviceEventEmitter.addListener(PLUGIN_CONFIG_EVENT, msg => {
    console.log("Config button msg:" + msg);
    if (timeConfigEvent != null && timeConfigEvent != undefined) {
      clearTimeout(timeConfigEvent);
    }
    addConfigNotifyIds = [];
    lastConfigEventMsg = 8;
    console.log("addConfigButtonListener configSubscriptions size:" + configSubscriptions.size);
    for (let [key, value] of configSubscriptions) {
      // addNotifyIds is asynchronous, so check if notification has been sent during asynchronous addition
      if (addConfigNotifyIds != null && addConfigNotifyIds.length > 0 && addConfigNotifyIds.includes(key)) {
        continue;
      }
      console.log("addConfigButtonListener configSubscriptions key:" + key);
      value.listener.onClick();
    }
    timeConfigEvent = setTimeout(function () {
      lastConfigEventMsg = null;
      timeConfigEvent = null;
      addConfigNotifyIds = [];
    }, 1000);
  });
};

/// Add button event listener
const addButtonListener = () => {
  DeviceEventEmitter.addListener(PLUGIN_BUTTON_EVENT, msg => {
    console.log("MenuEvent msg:" + msg);
    if (timeMenuEvent != null && timeMenuEvent != undefined) {
      clearTimeout(timeMenuEvent);
    }
    addButtonNotifyIds = [];
    lastButtonEventMsg = msg;
    for (let [key, value] of buttonEventSubscriptions) {
      // addNotifyIds is asynchronous, so check if notification has been sent during asynchronous addition
      if (addButtonNotifyIds != null && addButtonNotifyIds.length > 0 && addButtonNotifyIds.includes(key)) {
        continue;
      }
      // Notify message
      value.listener.onButtonPress(msg);
    }
    timeMenuEvent = setTimeout(function () {
      lastButtonEventMsg = null;
      timeMenuEvent = null;
      addButtonNotifyIds = [];
    }, 1000);
  });
};
const notifyAllPluginLife = msg => {
  console.log("PluginTask map size:" + pluginLifeSubs.size);
  for (let [key, value] of pluginLifeSubs) {
    console.log("PluginTask map notifyPluginLife key:" + key);
    /// Check if notification has been sent during addition
    if (addPluginLifeNotifyIds != null && addPluginLifeNotifyIds.length > 0 && addPluginLifeNotifyIds.includes(key)) {
      continue;
    }
    notifyPluginLife(value.listener, msg);
  }
};
const notifyPluginLife = (listener, msg) => {
  if (listener == null) {
    return;
  }
  console.log("notifyPluginLife msg type:" + msg.life_state);
  switch (msg.life_state) {
    case PluginLifeType.start:
      listener.onStart();
      break;
    case PluginLifeType.stop:
      console.log("notifyPluginLife onStop listener:" + listener);
      listener.onStop();
      break;
  }
};
const PluginManager = {
  /* init(): void {
    if (isInit) {
      return;
    }
    isInit = true;
    NativeEvent?.onMounted();
    AppRegistry.registerHeadlessTask(pluginTask, () => PluginTask);
    AppRegistry.startHeadlessTask(taskId, pluginTask, "Task");
  }, */

  // Initialize the plugin
  async init() {
    console.log("PluginManager init");
    if (isInit) {
      return;
    }
    var initFlag = true;
    if (initFlag) {
      isInit = true;
      registerListener();
      NativePluginManager.onMounted();

      /* AppRegistry.registerHeadlessTask(pluginTask, () => PluginTask);
      AppRegistry.startHeadlessTask(taskId, pluginTask, "Task"); */
    }
  },
  // Listen to plugin lifecycle events
  addPluginLifeListener(listener) {
    console.log("addPluginLifeListener:");
    var id = pluginLifeListenerIdCount++;
    const subscription = {
      id: id,
      listener: listener,
      remove: () => {
        console.log("subscription remove id:" + id);
        pluginLifeSubs.delete(id);
      }
    };
    pluginLifeSubs.set(id, subscription);
    console.log("addPluginLifeListener end pluginLifeListenerIdCount:" + id + "===" + pluginLifeSubs.size);
    /// Add listener may be later than message arrives, need to send a message
    if (lastPluginLifeMsg != null && lastPluginLifeMsg != undefined) {
      if (addPluginLifeNotifyIds == null) {
        addPluginLifeNotifyIds = [id];
      } else {
        addPluginLifeNotifyIds.push(id);
      }
      notifyPluginLife(listener, lastPluginLifeMsg);
    }
    return subscription;
  },
  /**
   * Registers a button listener to receive plugin button click events.
   * @param {ButtonListener}buttonListener The button listener.
   * @returns {ButtonSubscription} A subscription handle that can be used to remove the listener.
   */
  registerButtonListener(buttonListener) {
    var id = buttonEventSubIdCount++;
    const subscription = {
      id: id,
      listener: buttonListener,
      remove: () => {
        console.log("registerButtonListener remove id:" + id);
        buttonEventSubscriptions.delete(id);
      }
    };
    buttonEventSubscriptions.set(id, subscription);
    console.log("registerButtonListener end buttonEventSubIdCount:" + id + "===" + buttonEventSubscriptions.size);
    console.log("registerButtonListener lastButtonEventMsg:" + JSON.stringify(lastButtonEventMsg));

    // Add listener may be later than message arrives, need to send a message
    if (lastButtonEventMsg != null && lastButtonEventMsg != undefined) {
      if (addButtonNotifyIds == null) {
        addButtonNotifyIds = [id];
      } else {
        addButtonNotifyIds.push(id);
      }
      buttonListener.onButtonPress(lastButtonEventMsg);
    }
    return subscription;
  },
  /**
   * Registers a config-button listener to receive config button click events.
   * @param {ConfigButtonListener}buttonListener The config button listener.
   * @returns {ConfigButtonSubscription} A subscription handle that can be used to remove the listener.
   */
  registerConfigButtonListener(buttonListener) {
    var id = configEventSubIdCount++;
    const subscription = {
      id: id,
      listener: buttonListener,
      remove: () => {
        configSubscriptions.delete(id);
      }
    };
    configSubscriptions.set(id, subscription);
    if (lastConfigEventMsg != null && lastConfigEventMsg != undefined) {
      if (addConfigNotifyIds == null) {
        addConfigNotifyIds = [id];
      } else {
        addConfigNotifyIds.push(id);
      }
      buttonListener.onClick();
    }
    return subscription;
  },
  /**
   * Registers a language-change listener to receive system language updates.
   * @param {PluginEventListener}langListener The language event listener.
   * @returns {PluginEventSubscription} A subscription handle that can be used to remove the listener.
   */
  registerLangListener(langListener) {
    var id = langEventSubIdCount++;
    const subscription = {
      id: id,
      listener: langListener,
      remove: () => {
        langSubscriptions.delete(id);
      }
    };
    langSubscriptions.set(id, subscription);
    return subscription;
  },
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
  registerEventListener(event, registerType, penUpListener) {
    const subscription = {
      event: event,
      listener: penUpListener,
      remove: () => {
        NativePluginAPI.unregisterEventListener(event);
        eventSubscriptions.delete(event);
      }
    };
    eventSubscriptions.set(event, subscription);
    // Register the event via the native API.
    NativePluginAPI.registerEventListener(event, registerType);
    return subscription;
  },
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
  registerButton(type, appTypes, button) {
    console.log("registerButton type:" + type + " appType:" + appTypes + " button:", button);

    // Validate type: must be an integer 1, 2, or 3.
    if (typeof type !== 'number' || !Number.isInteger(type) || type !== 1 && type !== 2 && type !== 3) {
      throw new Error('Button type must be an integer: 1 (sidebar), 2 (lasso toolbar), or 3 (document selection toolbar).');
    }
    // Validate appTypes: must be an array.
    if (!Array.isArray(appTypes)) {
      throw new Error('App types must be an array.');
    }

    // Allowed app types (use enum constants for clearer intent).
    const allowedAppTypes = [AppType.Note, AppType.Doc];

    // Normalize and deduplicate (preserve order).
    const uniqueAppTypes = [];
    for (const t of appTypes) {
      if (typeof t !== 'string' || t.trim().length === 0) {
        throw new Error('Each app type must be a non-empty string.');
      }
      const v = t.trim().toUpperCase();
      if (!allowedAppTypes.includes(v)) {
        // join() accepts only a single separator argument.
        throw new Error(`Unsupported app type: ${t}. Supported values: ${allowedAppTypes.join(', ')}`);
      }
      if (!uniqueAppTypes.includes(v)) {
        uniqueAppTypes.push(v);
      }
    }

    // Validate button: must be an object.
    if (typeof button !== 'object' || button === null) {
      throw new Error('Button payload must be an object.');
    }
    return NativePluginManager.registerButtonRes(type, uniqueAppTypes, button);
  },
  /**
   * Unregisters a plugin button.
   * @param id Unique button identifier.
   * @returns Promise<boolean> Whether the button was successfully unregistered.
   */
  unregisterButton(id) {
    return NativePluginManager.unregisterButtonRes(id);
  },
  /**
   * Gets a button's enabled state.
   * @param id Unique button identifier.
   * @returns Promise<boolean> Button state: true = enabled, false = disabled.
   */
  getButtonState(id) {
    try {
      verifyParams({
        id: {
          type: 'number',
          required: true,
          nonEmpty: true
        }
      }, {
        id
      }, {
        allowUnknown: false,
        rootName: 'getButtonState'
      });
    } catch (error) {
      throw error;
    }
    return NativePluginManager.getButtonState(id);
  },
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
  setButtonState(id, state) {
    try {
      verifyParams({
        id: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        state: {
          type: 'boolean',
          required: true
        }
      }, {
        id,
        state
      }, {
        allowUnknown: false,
        rootName: 'setButtonState'
      });
    } catch (error) {
      throw error;
    }
    return NativePluginManager.setButtonState(id, state);
  },
  /**
   * Registers the plugin config button.
   * @returns Promise<boolean> Whether the config button was successfully registered.
   */
  registerConfigButton() {
    return NativePluginManager.registerConfigButton();
  },
  // Get plugin directory path
  /**
   * Gets the plugin directory path.
   * @returns Promise<string | null | undefined> Plugin directory path.
   */
  getPluginDirPath() {
    return NativePluginManager.getPluginDirPath();
  },
  // Get plugin name
  /**
   * Gets the plugin name.
   * @returns Promise<string | null | undefined> Plugin name.
   */
  getPluginName() {
    return NativePluginManager.getPluginName();
  },
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
  getDeviceType() {
    return NativePluginManager.getDeviceType();
  },
  /**
   * Closes the plugin view.
   * @returns Promise<boolean> Whether the plugin view was successfully closed.
   */
  closePluginView() {
    return NativePluginManager.closePluginView();
  }
};

// Export default
export default PluginManager;
//# sourceMappingURL=PluginManager.js.map