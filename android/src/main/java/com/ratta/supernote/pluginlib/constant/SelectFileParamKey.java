package com.ratta.supernote.pluginlib.constant;

public class SelectFileParamKey {
    /**
     * Parameters passed from RN
     * selectType: 0 - Normal file selection, 1 - Single file selection
     * suffixList: List of file extensions
     * maxNum: Maximum number of files that can be selected
     * title: Center title
     * rightButtonText: Top right button text
     * selectPathList: Absolute paths of files to be selected by default
     * needSelectFolder: Folder to navigate to
     * limitPath: Restrict to specific folder, must be used with needSelectFolder
     */
    public static final String RN_KEY_SELECT_TYPE = "selectType";
    public static final String RN_KEY_SUFFIX_LIST = "suffixList";
    public static final String RN_KEY_MAX_NUM = "maxNum";
    public static final String RN_KEY_TITLE = "title";
    public static final String RN_KEY_RIGHT_BUTTON_TEXT = "rightButtonText";
    public static final String RN_KEY_SELECT_PATH_LIST = "selectPathList";
    public static final String RN_KEY_NEED_SELECT_FOLDER = "needSelectFolder";
    public static final String RN_KEY_LIMIT_PATH = "limitPath";


    /**
     * Key values for parameters required by the file selection APP
     *
     * int select_type: 0 - Normal file selection; 1 - Single file selection
     * string[] suffix_array: File extensions required by the caller
     * int max_attachment_number: Maximum number of files that can be selected
     * string title: Center displayed title
     * string right_text: Top right button text
     * string[] select_path: Absolute paths of files to be selected by default
     * string need_select_folder: Folder to navigate to
     * string limit_path: Restrict to specific folder, must be used with need_select_folder
     */
    public static final String SELECT_KEY_SELECT_TYPE = "select_type";
    public static final String SELECT_KEY_SUFFIX_ARRAY = "suffix_array";
    public static final String SELECT_KEY_MAX_NUM = "max_attachment_number";
    public static final String SELECT_KEY_TITLE = "title";
    public static final String SELECT_KEY_RIGHT_TXT = "right_text";
    public static final String SELECT_KEY_SELECT_PATH = "select_path";
    public static final String SELECT_KEY_NEED_SELECT_FOLDER = "need_select_folder";
    public static final String SELECT_KEY_LIMIT_PATH = "limit_path";
}
