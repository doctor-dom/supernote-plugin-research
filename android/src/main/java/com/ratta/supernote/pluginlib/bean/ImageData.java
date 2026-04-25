package com.ratta.supernote.pluginlib.bean;


import android.graphics.Bitmap;
import android.graphics.Rect;

/**
 * Image data
 */
public class ImageData {
    // Bitmap data
    public Bitmap bitmap;

    /// Image display area
    public Rect rect;
    public boolean isPluginEdit = false;

    public boolean isLasso = false;

    public ImageData(Bitmap bitmap, Rect rect) {
        this.bitmap = bitmap;
        this.rect = rect;
    }

    public void recycle() {
        if (bitmap == null || bitmap.isRecycled()) {
            return;
        }
        bitmap.recycle();
        bitmap = null;
    }
}
