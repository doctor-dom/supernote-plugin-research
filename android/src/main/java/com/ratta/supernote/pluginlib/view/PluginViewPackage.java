package com.ratta.supernote.pluginlib.view;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PluginViewPackage implements ReactPackage {

    PluginAppAPI pluginApp;

    public PluginViewPackage() {
    }

    public PluginViewPackage(PluginAppAPI pluginApp) {
        this.pluginApp = pluginApp;
    }

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactApplicationContext) {

        return Collections.emptyList();
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactApplicationContext) {
        List<ViewManager> list = new ArrayList<>();

        return list;
    }
}
