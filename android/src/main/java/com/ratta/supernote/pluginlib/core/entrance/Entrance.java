package com.ratta.supernote.pluginlib.core.entrance;

import android.util.Log;

import androidx.annotation.Nullable;

/**
 * Plugin entrance base class
 */
public class Entrance {

    // Plugin ID
    protected String pluginID="";

    // Plugin name
    protected String pluginName="";

    // Button name
    protected String name = "";

    // Icon path
    protected String icon = "";

    // Button action type, determines which interface to open, defined by plugin
    protected int action;

    /**
     * Plugin display area type
     * 0: No extension needed
     * 1: Display near button
     * 2: Display as dialog
     * 3: Display fullscreen
     * 4: Display fullscreen, won't be dismissed
     */
    protected int regionType = 0;

    /**
     * Region width in dp
     */
    protected int regionWidth;

    /**
     * Region height in dp
     */
    protected int regionHeight;

    public Entrance() {
    }


    public Entrance(String pluginID, String pluginName, String name, String icon,
                               int expandButton, int action, int regionType, int regionWidth, int regionHeight) {
        this.pluginID = pluginID;
        this.pluginName = pluginName;
        this.name = name;
        this.icon = icon;
        this.action = action;
        this.regionType = regionType;
        this.regionWidth = regionWidth;
        this.regionHeight = regionHeight;
    }

    public String getPluginID() {
        return pluginID;
    }

    public void setPluginID(String pluginID) {
        this.pluginID = pluginID;
    }

    public String getPluginName() {
        return pluginName;
    }

    public void setPluginName(String pluginName) {
        this.pluginName = pluginName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getRegionType() {
        return regionType;
    }

    public void setRegionType(int regionType) {
        this.regionType = regionType;
    }

    public int getRegionWidth() {
        return regionWidth;
    }

    public void setRegionWidth(int regionWidth) {
        this.regionWidth = regionWidth;
    }

    public int getRegionHeight() {
        return regionHeight;
    }

    public void setRegionHeight(int regionHeight) {
        this.regionHeight = regionHeight;
    }

    public int getAction() {
        return action;
    }

    public void setAction(int action) {
        this.action = action;
    }

    @Override
    public boolean equals(@Nullable Object obj) {
        if (!(obj instanceof Entrance)) {
            Log.i("Entrance","equals false");
            return false;
        }
        Entrance other = (Entrance) obj;
        return other.pluginID.equals(pluginID)
                && other.pluginName.equals(pluginName)
                && other.name.equals(name)
                && other.icon.equals(icon)
                && other.action == action
                && other.regionType == regionType
                && other.regionHeight == regionHeight
                && other.regionWidth == regionWidth;
    }
}
