package com.ratta.supernote.pluginlib.core.listener;

public interface RNEventListener extends BaseListener {
    void onMounted();
    void onStop();

    void onClick();

    void onDismissLassoBar();
}
