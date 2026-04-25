package com.ratta.supernote.pluginlib.utils;

import android.content.Context;
import android.os.Build;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;
import android.view.Surface;
import android.view.WindowManager;

/**
 * @Author dxl
 * @Date 2024/3/26 17:03
 * @Email lex911118@gmail.com
 * @Description This is DeviceUtils
 */
public class DeviceUtils {
    private static final String TAG = "DeviceUtils";
    // Device identifiers
    private static final String DEVICE_MODEL_A6X = "Supernote A6 X";
    private static final String DEVICE_MODEL_A5X = "Supernote A5 X";
    private static final String DEVICE_MODEL_NOMAD = "Supernote Nomad";
    private static final String DEVICE_MODEL_A5X2 = "A5X2";

    public static final boolean isA5X = DEVICE_MODEL_A5X.equals(Build.MODEL);
    public static final boolean isA6X = DEVICE_MODEL_A6X.equals(Build.MODEL);
    public static final boolean isNomad = DEVICE_MODEL_NOMAD.equals(Build.MODEL);

    public static final boolean isA5X2 = DEVICE_MODEL_A5X2.equals(Build.BOARD);

    public static int mDeviceType;
    // Device width, height and angle
    public static int SCREEN_ANGLE = 0;
    public static int SCREEN_WIDTH = 1404;
    public static int SCREEN_HEIGHT = 1872;
    // Left/Right hand
    public static boolean HAND_LEFT = false;

    public interface DeviceType {
        int DEVICE_TYPE_A5 = 0;
        int DEVICE_TYPE_A6 = 1;
        int DEVICE_TYPE_A6X = 2;
        int DEVICE_TYPE_A5X = 3;
        int DEVICE_TYPE_A6X2 = 4;
        int DEVICE_TYPE_A5X2 = 5;
    }

    /**
     * Get device type
     * Don't change the order here, if you need to change, check related methods
     *
     * @return 0 for A6X, 1 for A5X, 2 for A6X2
     */
    public static int getDeviceType() {
        if (isA6X) {
            mDeviceType = DeviceType.DEVICE_TYPE_A6X;
        } else if (isA5X) {
            mDeviceType = DeviceType.DEVICE_TYPE_A5X;
        } else if (isNomad) {
            if (isA5X2) {
                mDeviceType = DeviceType.DEVICE_TYPE_A5X2;
            } else {
                mDeviceType = DeviceType.DEVICE_TYPE_A6X2;
            }
        }
        return mDeviceType;
    }

    public static boolean isA6Device() {
        return isA6X || (isNomad && !isA5X2);
    }

    public static boolean isNewDevice() {
        return isNomad;
    }

    public static float heightDividedByWidthScale() {
        return 1872 / 1404f;
    }

    public static int getDeviceWidth(boolean isSplit, boolean isLandscape) {
        if (isSplit) {
            return isA5X2 ? (isLandscape ? 2560 : 3414) : (isLandscape ? 1872 : 2496);
        } else {
            return isA5X2 ? (isLandscape ? 2560 : 1920) : (isLandscape ? 1872 : 1404);
        }
    }

    public static int getDeviceHeight(boolean isSplit, boolean isLandscape) {
        if (isSplit) {
            return isA5X2 ? (isLandscape ? 3414 : 2560) : (isLandscape ? 2496 : 1872);
        } else {
            return isA5X2 ? (isLandscape ? 1920 : 2560) : (isLandscape ? 1404 : 1872);
        }
    }


    public static void updateDeviceDisplay(Context context) {
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (windowManager != null) {
            Display display = windowManager.getDefaultDisplay();
            DisplayMetrics displayMetrics = context.getResources().getDisplayMetrics();
            int width = displayMetrics.widthPixels;
            int height = displayMetrics.heightPixels;
//
//            float screenWidthPx = displayMetrics.widthPixels;
//            float density = displayMetrics.density;
//            int screenWidthDp = (int) (screenWidthPx / density);
//            Log.e(TAG, "screenWidthDp " + screenWidthDp);

            Log.i(TAG, "width: " + width + ",height:" + height);

            SCREEN_ANGLE = display.getRotation();
            switch (SCREEN_ANGLE) {
                case Surface.ROTATION_0:
                case Surface.ROTATION_180:
                    SCREEN_WIDTH = DeviceUtils.isA5X2 ? 1920 : 1404;
                    SCREEN_HEIGHT = DeviceUtils.isA5X2 ? 2560 : 1872;
                    break;
                case Surface.ROTATION_90:
                case Surface.ROTATION_270:
                    SCREEN_WIDTH = DeviceUtils.isA5X2 ? 2560 : 1872;
                    SCREEN_HEIGHT =DeviceUtils.isA5X2 ? 1920 :  1404;
                    break;
            }
        }
        Log.e(TAG, "updateDeviceDisplay: SCREEN_ANGLE " + SCREEN_ANGLE + " SCREEN_WIDTH " +SCREEN_WIDTH + " SCREEN_HEIGHT " + SCREEN_HEIGHT);
    }

    public static void updateDeviceDisplay(int orientation) {
        switch (orientation) {
            case 0:
                SCREEN_ANGLE = 0;
                SCREEN_WIDTH = DeviceUtils.isA5X2 ? 1920 : 1404;
                SCREEN_HEIGHT = DeviceUtils.isA5X2 ? 2560 : 1872;
                break;
            case 180:
                SCREEN_ANGLE = 2;
                SCREEN_WIDTH = DeviceUtils.isA5X2 ? 1920 : 1404;
                SCREEN_HEIGHT = DeviceUtils.isA5X2 ? 2560 : 1872;
                break;
            case 90:
                SCREEN_ANGLE = 1;
                SCREEN_WIDTH = DeviceUtils.isA5X2 ? 2560 : 1872;
                SCREEN_HEIGHT =DeviceUtils.isA5X2 ? 1920 :  1404;
                break;
            case 270:
                SCREEN_ANGLE = 3;
                SCREEN_WIDTH = DeviceUtils.isA5X2 ? 2560 : 1872;
                SCREEN_HEIGHT =DeviceUtils.isA5X2 ? 1920 :  1404;
                break;
        }
    }

    public static boolean isPortrait() {
        return SCREEN_ANGLE == Surface.ROTATION_0 || SCREEN_ANGLE == Surface.ROTATION_180;
    }

    public static int getItemGridCount(String type) {
        int gridCount = 0;
        switch (type) {
            case "five star":
            case "thumbnail":
                gridCount = isPortrait() ? 3 : 4;
                break;
            case "recent":
            case "plugin menu":
            case "plugin sub menu":
            case "plugin manager":
                gridCount = 1;
                break;
            case "style":
                gridCount = isPortrait() ? 4 : 5;
                break;
        }
        return gridCount;
    }

    public static int getItemMaxCount(String type) {
        int maxCount = 0;
        switch (type) {
            case "five star":
            case "thumbnail":
                maxCount = isPortrait() ? 9 : 8;
                break;
            case "recent":
                maxCount = DeviceUtils.isA6Device() ? 6 : 8;
                break;
            case "plugin menu":
            case "plugin manager":
                maxCount = DeviceUtils.isA6Device() ? (isPortrait() ? 7 : 5) : (isPortrait() ? 8 : 6);
                break;
            case "plugin sub menu":
                maxCount = 3;
                break;
            case "style":
                maxCount = isPortrait() ? 12 : 10;
                break;
        }
        return maxCount;
    }

    public static int getThumbnailWidth() {
        int width = 480;
        switch (mDeviceType) {
            case DeviceType.DEVICE_TYPE_A5X:
                width = 756;
                break;
            case DeviceType.DEVICE_TYPE_A5X2:
                width = 960;
                break;
        }
        return width;
    }

    public static int getThumbnailHeight() {
        int height = 640;
        switch (mDeviceType) {
            case DeviceType.DEVICE_TYPE_A5X:
                height = 1008;
                break;
            case DeviceType.DEVICE_TYPE_A5X2:
                height = 1280;
                break;
        }
        return height;
    }
}
