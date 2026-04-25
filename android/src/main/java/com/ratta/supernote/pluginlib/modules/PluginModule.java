package com.ratta.supernote.pluginlib.modules;


import android.content.Context;
import android.util.Log;
import android.view.Display;
import android.view.WindowManager;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.ratta.supernote.pluginlib.NativePluginManagerSpec;
import com.ratta.supernote.pluginlib.api.PluginButtonAPI;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;
import com.ratta.supernote.pluginlib.utils.DeviceUtils;
import com.ratta.supernote.pluginlib.utils.UiHandler;

import java.text.Normalizer;

/**
 * Module for getting Plugin information from RN side
 */
public class PluginModule extends NativePluginManagerSpec {
    private final String TAG = NAME;
    PluginAppAPI pluginApp;
    ReactContext mReactContext;

    public PluginModule(ReactApplicationContext reactContext, PluginAppAPI pluginApp) {
        super(reactContext);
        mReactContext = reactContext;
        this.pluginApp = pluginApp;
        if(pluginApp != null) {
            pluginApp.setPluginModule(this);

        }
    }

    public void sendData2RN(String dataName, Object data) {
        Log.i(TAG,"sendData2RN dataName:"+dataName);
        Log.i(TAG,"sendData2RN mReactContext:"+mReactContext);
        if(data != null) {
            Log.i(TAG,"sendData2RN data:"+data.toString());
        }
        mReactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(dataName, data);
    }

    @Override
    public void onMounted() {
        Log.i(NAME,"PluginAPP onMounted Success");
//        sendData2RN("plugin_event_lang","en");
        if(pluginApp != null) {
            pluginApp.onMounted();
        }

    }

    @Override
    public void onStop() {
        if(pluginApp != null) {
            pluginApp.onStop();
        }

    }

    @Override
    public void getOrientation(Promise promise) {
        Log.i(NAME,"plugin getOrientation");
        WindowManager windowManager = (WindowManager) mReactContext
            .getSystemService(Context.WINDOW_SERVICE);
        if (windowManager != null) {
            Display display = windowManager.getDefaultDisplay();
            promise.resolve(display.getRotation());
        } else {
            promise.reject(new Throwable("windowManager is null"));
        }
    }

    @Override
    public void getPluginDirPath(Promise promise) {

        Log.i(TAG, "getPluginDirPath pluginPath:"+pluginApp.getPluginPath());
        promise.resolve(pluginApp.getPluginPath());
    }

    @Override
    public void getPluginName(Promise promise) {
        promise.resolve(pluginApp.getName());
    }

    @Override
    public void getDeviceType(Promise promise) {
        promise.resolve(DeviceUtils.getDeviceType());
    }


    @Override
    public void registerButtonRes(double type, ReadableArray appTypes, ReadableMap button, Promise promise) {
        Log.i(NAME,"plugin registerButtonRes");
        PluginButtonAPI.getInstance().registerButton(pluginApp, type,appTypes, button, promise);

    }

    @Override
    public void modifyButtonRes(ReadableMap button, Promise promise) {
        Log.i(NAME,"plugin modifyMenuItem");
        PluginButtonAPI.getInstance().modifyButton(pluginApp, button, promise);
    }

    @Override
    public void unregisterButtonRes(double id, Promise promise) {
        Log.i(NAME,"plugin unregisterButtonRes");
        try {
            PluginButtonAPI.getInstance().unregisterPluginButton((int) id, pluginApp.getPluginID());
        } catch (Throwable e) {
            promise.reject(e);
        }
        promise.resolve(true);
    }

    @Override
    public void registerConfigButton(Promise promise) {
        Log.i(NAME,"plugin registerConfigButtonRes");

        if(pluginApp != null) {
            pluginApp.registerConfigButtonRes();

        }

        promise.resolve(true);
    }

    @Override
    public void showPluginView(Promise promise) {
        if(pluginApp == null) {
            promise.reject(new Throwable("PluginApp is null"));
            return;
        }
        UiHandler.getInstance().handler().post(new Runnable() {
            @Override
            public void run() {
                pluginApp.showPluginView(1);
            }
        });

    }

    @Override
    public void closePluginView(Promise promise) {
        if(pluginApp == null) {
            promise.reject(new Throwable("PluginApp is null"));
            return;
        }
        UiHandler.getInstance().handler().post(new Runnable() {
            @Override
            public void run() {
                pluginApp.closePluginView();
            }
        });
    }

    @Override
    public void invalidatePluginView() {
        if(pluginApp == null) {
            return;
        }
        UiHandler.getInstance().handler().post(new Runnable() {
            @Override
            public void run() {
                pluginApp.invalidatePluginView();
            }
        });

    }

    // Normalize text in a diacritic- and case-insensitive way.
    @Override
    public void normalize(String text, Promise promise) {
        promise.resolve(Normalizer.normalize(text, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", ""));
    }

    @Override
    public void setFullAuto(boolean enable) {
        // TODO Unify handling
    }

    @Override
    public void getButtonState(double id, Promise promise) {
        PluginButtonAPI.getInstance().getButtonState(pluginApp.getPluginID(), id, promise);
    }

    @Override
    public void setButtonState(double id, boolean enable, Promise promise) {
        PluginButtonAPI.getInstance().setButtonState(pluginApp.getPluginID(), id,enable, promise);

    }
}
