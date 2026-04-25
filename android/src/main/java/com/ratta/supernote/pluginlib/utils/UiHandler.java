package com.ratta.supernote.pluginlib.utils;

import android.os.Handler;
import android.os.Looper;

public class UiHandler {
    private Handler uiHandler = new Handler(Looper.getMainLooper());
    private static UiHandler instance = null;

    public static UiHandler getInstance() {
        if (instance == null) {
            Class var0 = UiHandler.class;
            synchronized(UiHandler.class) {
                if (instance == null) {
                    instance = new UiHandler();
                }
            }
        }

        return instance;
    }

    private UiHandler() {
    }

    public Handler handler() {
        return this.uiHandler;
    }
}
