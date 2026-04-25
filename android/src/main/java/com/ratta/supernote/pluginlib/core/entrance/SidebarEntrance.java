package com.ratta.supernote.pluginlib.core.entrance;

import android.util.Log;

import androidx.annotation.Nullable;


/**
 * Sidebar entrance
 */
public class SidebarEntrance extends Entrance {



    /**
     * Whether to extend existing buttons, only applies to sidebar buttons, not edit toolbar
     * 0: default, no extension, adds an entry to sidebar
     * 1: pen
     * 2: eraser
     * 3: layer
     * 4: template
     * 5: thumbnail
     */
    private int expandButton = 0;


    public SidebarEntrance() {
    }


    public SidebarEntrance(String pluginID, String pluginName, String name, String icon,
                           int expandButton, int action, int regionType, int regionWidth, int regionHeight, int expandButton1) {
        super(pluginID, pluginName, name, icon, expandButton, action, regionType, regionWidth, regionHeight);
        this.expandButton = expandButton1;
    }


    public int getExpandButton() {
        return expandButton;
    }

    public void setExpandButton(int expandButton) {
        this.expandButton = expandButton;
    }

    @Override
    public boolean equals(@Nullable Object obj) {
        if (!(obj instanceof SidebarEntrance)) {
            Log.i("SidebarEntrance","equals false");
            return false;
        }
        SidebarEntrance other = (SidebarEntrance) obj;
        return super.equals(obj) && expandButton == other.expandButton;
    }
}
