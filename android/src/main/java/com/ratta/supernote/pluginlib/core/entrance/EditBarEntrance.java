package com.ratta.supernote.pluginlib.core.entrance;

import androidx.annotation.Nullable;

import java.util.List;

/**
 * Edit toolbar entrance
 */
public class EditBarEntrance extends Entrance {

    /// Whether to hide toolbar, default is false
    private boolean isHideToolbar = false;


    /**
     * Edit data types
     * 0: Handwritten strokes
     * 1: Title
     * 2: Image
     * 3: Text
     * 4: Link
     */
    private List<Integer> editDataTypes = null;


    public EditBarEntrance(String pluginID, String pluginName, String name, String icon, int expandButton, int action, int regionType, int regionWidth, int regionHeight, boolean isHideToolbar, List<Integer> editDataTypes) {
        super(pluginID, pluginName, name, icon, expandButton, action, regionType, regionWidth, regionHeight);
        this.isHideToolbar = isHideToolbar;
        this.editDataTypes = editDataTypes;
    }

    public EditBarEntrance() {
    }

    public boolean isHideToolbar() {
        return isHideToolbar;
    }

    public void setHideToolbar(boolean hideToolbar) {
        isHideToolbar = hideToolbar;
    }

    public List<Integer> getEditDataTypes() {
        return editDataTypes;
    }

    @Override
    public String toString() {
        return "EditBarEntrance{" +
                "isHideToolbar=" + isHideToolbar +
                ", editDataTypes=" + editDataTypes.toString() +
                ", pluginID='" + pluginID + '\'' +
                ", pluginName='" + pluginName + '\'' +
                ", name='" + name + '\'' +
                ", icon='" + icon + '\'' +
                ", action=" + action +
                ", regionType=" + regionType +
                ", regionWidth=" + regionWidth +
                ", regionHeight=" + regionHeight +
                '}';
    }

    @Override
    public boolean equals(@Nullable @org.jetbrains.annotations.Nullable Object obj) {
        if (!(obj instanceof EditBarEntrance)) {
            return false;
        }
        EditBarEntrance other = (EditBarEntrance) obj;

        return super.equals(obj) && isHideToolbar == other.isHideToolbar
                && editDataTypes == other.editDataTypes;
    }
}
