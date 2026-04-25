package com.ratta.supernote.pluginlib.error;

import com.facebook.react.bridge.JSExceptionHandler;

public abstract class PluginJSExceptionHandler implements JSExceptionHandler {

    String pluginID;

    public PluginJSExceptionHandler(String pluginID) {
        super();
        this.pluginID = pluginID;
    }

    public abstract void handleException(String pluginID, Exception e);

    @Override
    public void handleException(Exception e) {
        handleException(pluginID, e);

    }
}
