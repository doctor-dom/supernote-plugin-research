package com.ratta.supernote.pluginlib.api;

/**
 * Accesses cached data from the host app.
 */
public abstract class HostDataCacheAPI {

    private static HostDataCacheAPI instance;

    public static HostDataCacheAPI getInstance() {
        return instance;
    }

    public static void init(HostDataCacheAPI hostCommonAPI) {
        instance = hostCommonAPI;
    }

    /**
     * Gets the currently opened file path.
     * @return
     */
    public abstract String getCurrentFilePath();
}
