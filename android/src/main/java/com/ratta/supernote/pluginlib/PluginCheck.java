package com.ratta.supernote.pluginlib;

/**
 * Plugin file-path access check utility.
 *
 * Rules:
 * 1) If the path does not start with the BASE prefix, skip validation.
 * 2) If pluginId is non-empty, require path to start with BASE + "/" +
 * pluginId; otherwise throw SecurityException.
 * 3) If pluginId is empty, do not validate.
 */
public final class PluginCheck {

    private static volatile String pluginId = "";

    private static final String BASE = "/data/data/com.ratta.supernote.testfile/files/plugins";

    private PluginCheck() {
    }

    /**
     * Sets current plugin ID.
     *
     * @param id Plugin ID. Null/empty disables validation.
     */
    public static void setPluginId(String id) {
        pluginId = id == null ? "" : id;
    }

    /**
     * Validates path access.
     *
     * @param p Target path
     * @throws SecurityException Thrown when access is not allowed
     */
    public static void checkPluginAccess(String p) {
        if (p == null)
            return;
        String id = pluginId;
        if (id.isEmpty())
            return;
        if (!p.startsWith(BASE))
            return;
        String required = BASE + "/" + id;
        if (!p.startsWith(required)) {
            throw new SecurityException("Insufficient permission: access denied.");
        }
    }

    /**
     * Precheck: File(String)
     *
     * @param path Path
     */
    public static void precheckPath(String path) {
        checkPluginAccess(path);
    }

    /**
     * Precheck: File(String parent, String child)
     *
     * @param parent Parent path
     * @param child  Child path
     */
    public static void precheckParentChild(String parent, String child) {
        String p;
        if (parent == null || parent.isEmpty()) {
            p = child;
        } else {
            p = parent.endsWith("/") ? (parent + child) : (parent + "/" + child);
        }
        checkPluginAccess(p);
    }

    /**
     * Precheck: File(java.io.File parent, String child)
     *
     * @param parent Parent File
     * @param child  Child path
     */
    public static void precheckFileChild(java.io.File parent, String child) {
        String base = (parent == null) ? "" : parent.getPath();
        String p = base.isEmpty() ? child : (base.endsWith("/") ? (base + child) : (base + "/" + child));
        checkPluginAccess(p);
    }

    /**
     * Precheck: File(java.net.URI)
     *
     * @param uri URI
     */
    public static void precheckUri(java.net.URI uri) {
        if (uri == null)
            return;
        checkPluginAccess(uri.getPath());
    }
}
