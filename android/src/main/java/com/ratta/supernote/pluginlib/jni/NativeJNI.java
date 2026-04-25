package com.ratta.supernote.pluginlib.jni;

import java.util.List;

public class NativeJNI {
    static {
        System.loadLibrary("native-lib");
    }

    public native void getFilePath(String path, String[] suffix, List<String> list);
}
