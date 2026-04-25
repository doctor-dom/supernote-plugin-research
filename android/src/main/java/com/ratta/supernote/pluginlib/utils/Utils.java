package com.ratta.supernote.pluginlib.utils;

import android.content.Context;
import android.content.res.AssetManager;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.ratta.supernote.pluginlib.constant.paramkey.ResponseKey;
import com.ratta.supernote.plugincommon.response.PluginAPIResponse;
import com.ratta.supernote.plugincommon.response.PluginAPIResponseError;

import java.io.FileInputStream;
import java.io.InputStream;
import java.security.MessageDigest;

public class Utils {
    /**
     * Convert dp units to px (pixels) based on device resolution
     */
    public static int dip2px(Context context, float dpValue) {
        final float scale = context.getResources().getDisplayMetrics().density;
        return (int) (dpValue * scale + 0.5f);
    }

    /**
     * Convert px (pixels) to dp units based on device resolution
     */
    public static int px2dip(Context context, float pxValue) {
        final float scale = context.getResources().getDisplayMetrics().density;
        return (int) (pxValue / scale + 0.5f);
    }

    public static String getFileMD5(String filePath) {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("MD5");
            InputStream is = new FileInputStream(filePath);

            byte[] buffer = new byte[1024];
            int read = 0;
            while ((read = is.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            is.close();

            byte[] md5Bytes = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte md5Byte : md5Bytes) {
                hexString.append(Integer.toString((md5Byte & 0xFF) + 0x100, 16).substring(1));
            }
            return hexString.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static String getAssertsFileMD5(Context context, String fileName) {
        MessageDigest digest;
        try {
            AssetManager assetManager = context.getAssets();
            digest = MessageDigest.getInstance("MD5");
            InputStream is = assetManager.open(fileName);

            byte[] buffer = new byte[1024];
            int read = 0;
            while ((read = is.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            is.close();

            byte[] md5Bytes = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte md5Byte : md5Bytes) {
                hexString.append(Integer.toString((md5Byte & 0xFF) + 0x100, 16).substring(1));
            }
            return hexString.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }




}
