package com.ratta.supernote.pluginlib.callback;

public interface UninstallCallback {
    void onSuccess();

    void onFailed(Throwable e);
}
