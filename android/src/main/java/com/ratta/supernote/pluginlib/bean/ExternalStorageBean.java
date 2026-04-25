package com.ratta.supernote.pluginlib.bean;

public class ExternalStorageBean {

    private int type; // 0 for OTG, 1 for TF card

    private String name;

    private String path;

    public ExternalStorageBean(int type, String name, String path) {
        this.type = type;
        this.name = name;
        this.path = path;
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }
}
