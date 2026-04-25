package com.ratta.supernote.pluginlib.api;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;
import com.ratta.supernote.plugincommon.data.common.trail.Trail;
import com.ratta.supernote.plugincommon.ui.menu.PluginButton;
import com.ratta.supernote.plugincommon.ui.menu.PluginEditButton;
import com.ratta.supernote.plugincommon.ui.menu.PluginHyperButton;
import com.ratta.supernote.plugincommon.ui.menu.PluginSideButton;

import java.util.Collections;
import java.util.List;

public abstract class PluginButtonAPI {

    protected static PluginButtonAPI instance;

    public interface PluginButtonDataListener {
        void onChange();
    }

    public static PluginButtonAPI getInstance() {
        if (instance == null) {
            instance = new PluginButtonAPI() {
                @Override
                public void init() {

                }

                @Override
                public void deletePluginButton(String pluginID) {

                }

                @Override
                public void enablePluginButton(String s) {

                }

                @Override
                public void disablePluginButton(String pluginID) {

                }

                @Override
                public void registerButton(PluginAppAPI pluginApp, double type,ReadableArray appTypeArr,
                                           ReadableMap menuItem, Promise promise) {

                }

                @Override
                public void registerSubButtonRes(PluginAppAPI pluginApp, ReadableMap menuItem, Promise promise) {

                }

                @Override
                public void unregisterPluginButton(int id, String pluginID) {

                }

                @Override
                public void modifyButton(PluginAppAPI pluginApp, ReadableMap menuItem, Promise promise) {

                }

                @Override
                public List<PluginSideButton> getPluginSideButtonList() {
                    return Collections.emptyList();
                }

                @Override
                public List<PluginEditButton> getPluginEditButtonList() {
                    return Collections.emptyList();
                }

                @Override
                public List<PluginHyperButton> getPluginHyperButtonList() {
                    return Collections.emptyList();
                }

                @Override
                public void updateUseTime(PluginButton pluginMenuItem) {

                }

                @Override
                public void addPluginSideButtonListener(PluginButtonDataListener pluginButtonDataListener) {

                }

                @Override
                public void addPluginEditButtonListener(PluginButtonDataListener pluginButtonDataListener) {

                }

                @Override
                public void addPluginHyperButtonListener(PluginButtonDataListener pluginButtonDataListener) {

                }

                @Override
                public void getButtonState(String pluginID,double id, Promise promise) {

                }

                @Override
                public void setButtonState(String pluginID,double id, boolean enable, Promise promise) {

                }
            };
        }
        return instance;
    }

    public PluginButtonAPI() {
    }

    /// Need to initialize by calling init in Application
    public static void init(PluginButtonAPI pluginEntranceAPI) {
        instance = pluginEntranceAPI;
    }

    public abstract void init();


    public abstract void deletePluginButton(String pluginID);

    public abstract void enablePluginButton(String s);

    public abstract void disablePluginButton(String pluginID);

    public abstract void registerButton(PluginAppAPI pluginApp, double type, ReadableArray appTypeArr,
                                        ReadableMap menuItem, Promise promise);

    public abstract void registerSubButtonRes(PluginAppAPI pluginApp, ReadableMap menuItem, Promise promise);

    public abstract void unregisterPluginButton(int id, String pluginID) throws Throwable;

    public abstract void modifyButton(PluginAppAPI pluginApp, ReadableMap menuItem, Promise promise);

    public abstract List<PluginSideButton> getPluginSideButtonList();

    public abstract List<PluginEditButton> getPluginEditButtonList();
    public abstract List<PluginHyperButton> getPluginHyperButtonList();

    public abstract void updateUseTime(PluginButton pluginMenuItem);

    public abstract void addPluginSideButtonListener(PluginButtonDataListener pluginButtonDataListener);

    public abstract void addPluginEditButtonListener(PluginButtonDataListener pluginButtonDataListener);
    public abstract void addPluginHyperButtonListener(PluginButtonDataListener pluginButtonDataListener);


    public abstract void getButtonState(String pluginID, double id, Promise promise);


    public abstract void setButtonState(String pluginID,double id, boolean enable, Promise promise);



}
