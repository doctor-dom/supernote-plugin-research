package com.ratta.supernote.pluginlib;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;
import com.ratta.supernote.pluginlib.modules.CommAPIModule;
import com.ratta.supernote.pluginlib.modules.FileSelector;
import com.ratta.supernote.pluginlib.modules.PluginModule;
import com.ratta.supernote.pluginlib.modules.RTNFileModule;
import com.ratta.supernote.pluginlib.modules.RTNUIUtils;

import java.util.HashMap;
import java.util.Map;

public class PluginPackage extends TurboReactPackage {
    private final String TAG = "PluginPackage";

    PluginAppAPI pluginApp;

    public PluginPackage(PluginAppAPI pluginApp) {
        this.pluginApp = pluginApp;
    }

    public PluginPackage() {
    }

    @Nullable
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        Log.i(TAG, "getModule test name:" + name);
        if (name.equals(FileSelector.NAME)) {
            return new FileSelector(reactContext);
        } else if (name.equals(RTNFileModule.NAME)) {
            return new RTNFileModule(reactContext);
        } else if (name.equals(RTNUIUtils.NAME)) {
            return new RTNUIUtils(reactContext);
        } else if (name.equals(PluginModule.NAME)) {
            return new PluginModule(reactContext, pluginApp);
        } else if (name.equals(CommAPIModule.NAME)) {
            return new CommAPIModule(reactContext, pluginApp);
        }
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            final Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
            moduleInfos.put(
                FileSelector.NAME,
                new ReactModuleInfo(
                    FileSelector.NAME,
                    FileSelector.NAME,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    false, // isCxxModule
                    true // isTurboModule

                ));


            moduleInfos.put(
                RTNUIUtils.NAME,
                new ReactModuleInfo(
                    RTNUIUtils.NAME,
                    RTNUIUtils.NAME,
                    false,
                    false,
                    false,
                    true
                )
            );

            moduleInfos.put(
                RTNFileModule.NAME,
                new ReactModuleInfo(
                    RTNFileModule.NAME,
                    RTNFileModule.NAME,
                    false,
                    false,
                    false,
                    true
                )
            );

            moduleInfos.put(
                PluginModule.NAME,
                new ReactModuleInfo(
                    PluginModule.NAME,
                    PluginModule.NAME,
                    false,
                    false,
                    false,
                    true
                )
            );

            moduleInfos.put(
                CommAPIModule.NAME,
                new ReactModuleInfo(
                    CommAPIModule.NAME,
                    CommAPIModule.NAME,
                    false,
                    false,
                    false,
                    true
                )
            );
            return moduleInfos;
        };
    }
}
