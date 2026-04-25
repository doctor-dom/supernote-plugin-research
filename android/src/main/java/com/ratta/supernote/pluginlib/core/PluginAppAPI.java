package com.ratta.supernote.pluginlib.core;

import com.facebook.react.bridge.WritableArray;
import com.ratta.supernote.pluginlib.core.listener.RNEventListener;
import com.ratta.supernote.pluginlib.modules.PluginModule;
import com.ratta.supernote.plugincommon.data.common.trail.Trail;

public abstract class PluginAppAPI {

    public abstract void onMounted();
    public abstract void onStop();
    public abstract String getPluginID();

    public abstract String getName();

    public abstract String getPluginPath();

    public abstract void showPluginView(int showType);

    public abstract void destroyPlugin();

    public abstract void stopPlugin();

    public abstract void closePluginView();

    public abstract Object getLayersJson();

    public abstract void setLayersJson(String layers);


    public abstract void registerConfigButtonRes();

    public abstract void invalidatePluginView();

    /// Whether it is loading
    public abstract boolean isLoading();

    public abstract void setIsLoading(boolean isLoading);

    /**
     * Sets the plugin name.
     * @param name
     */
    public abstract void setName(String name);

    public abstract void setPluginModule(PluginModule pluginModule);

    /**
     * Whether a stroke is currently lasso-selected.
     * @return
     */
    public abstract boolean isLassoTrail();

    public abstract void clearTrailCache();

    public abstract void addTrail(Trail trail);


    public abstract Trail getTrail(String uuid);

    public abstract void updateTrailMapMemorySize(long oldSize, long newSize);

    public abstract void removeTrail(String uuid);

    /**
     * Checks whether the Trail cache exceeds the limit.
     * @return
     */
    public abstract boolean checkTrailCache();

    public abstract WritableArray readTrailsFromFile(String path);
}
