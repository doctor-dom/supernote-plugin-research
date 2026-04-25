package com.ratta.supernote.pluginlib.core.state;

public enum PluginState {
    initialized(0),
    mounted(1),
    start(2),
    stop(3),
    unmounted(4),
    destroy(5);

    int value;

    PluginState(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }
}
