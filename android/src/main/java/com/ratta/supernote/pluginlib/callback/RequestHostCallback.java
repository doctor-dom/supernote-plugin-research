package com.ratta.supernote.pluginlib.callback;

import com.ratta.supernote.plugincommon.response.PluginAPIResponse;

/**
 * Callback for requesting data from the host app.
 */
public interface RequestHostCallback {
    void onResponse(PluginAPIResponse response);
}
