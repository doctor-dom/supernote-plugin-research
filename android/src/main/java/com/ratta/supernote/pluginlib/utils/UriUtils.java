package com.ratta.supernote.pluginlib.utils;

import android.text.TextUtils;

public class UriUtils {
  private  static final   String regex = "^(https?|ftp|file)://.+";
    public static boolean isUri(String uri) {
        if(TextUtils.isEmpty(uri)) {
            return false;
        }
        return uri.matches(regex);

    }
}
