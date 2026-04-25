package com.ratta.supernote.pluginlib.api;

import android.content.Context;

import com.ratta.supernote.pluginlib.callback.RattaDialogListener;

/**
 * Host UI API.
 */
public abstract class HostUIAPI {

    private static HostUIAPI instance;
    public static HostUIAPI getInstance() {
        return instance;
    }

    public static void init(HostUIAPI hostUIAPI) {
        instance = hostUIAPI;
    }

    /**
     * Close sidebar dialog data
     */
    public abstract void closeSideDialog();

    // Show tip dialog
    public abstract void showTipDialog(Context context, boolean isSuccess, String tip, RattaDialogListener listener);

    public abstract void showRattaDialog(Context context, String tip, String letBtnTxt, String rightBtnTxt, boolean isSuccess, RattaDialogListener listener);
}
