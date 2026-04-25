package com.ratta.supernote.pluginlib.api;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresPermission;

public abstract class HostContext {

    private static HostContext instance;

    public static HostContext getInstance() {
        return instance;
    }

    public HostContext() {
    }

    public static void init(HostContext hostContext) {
        instance = hostContext;
    }

    public  abstract void startActivityForResult(Intent intent, int requestCode,
                                            @Nullable Bundle options);
    public abstract void startActivity(Intent intent);
}
