package com.ratta.supernote.pluginlib.utils;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.text.TextUtils;
import android.util.Base64;

import java.io.ByteArrayOutputStream;

public class BitmapUtils {
    public static void recycleBitmap(Bitmap bitmap) {
        if (bitmap == null) {
            return;
        }
        bitmap.recycle();
        bitmap = null;
    }

    public static boolean isBitmapOutOf8000(String path) {

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(path, options);
        return options.outWidth > 8000 && options.outHeight > 8000;
    }

    public static boolean isBitmapOutOf2560(String path) {

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(path, options);
        return options.outWidth > 2560 || options.outHeight > 2560;
    }

    public static String bitmap2Str(Bitmap bitmap) {
        if (bitmap == null || bitmap.isRecycled()) {
            return null;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
        byte[] bytes = out.toByteArray();
        String bitmapStr = Base64.encodeToString(bytes, Base64.DEFAULT);
        return bitmapStr;
    }

    public static Bitmap str2Bitmap(String bitmapStr) {
        if (TextUtils.isEmpty(bitmapStr)) {
            return null;
        }
        byte[] imageBytes = Base64.decode(bitmapStr, Base64.DEFAULT);
        if (imageBytes == null) {
            return null;
        }
        Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);
        return bitmap;
    }
}
