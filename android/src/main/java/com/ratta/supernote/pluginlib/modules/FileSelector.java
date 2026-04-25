package com.ratta.supernote.pluginlib.modules;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.ratta.supernote.pluginlib.NativeFileSelectorSpec;
import com.ratta.supernote.pluginlib.R;
import com.ratta.supernote.pluginlib.api.HostContext;
import com.ratta.supernote.pluginlib.constant.SelectFileParamKey;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;

import java.util.ArrayList;
import java.util.List;

public class FileSelector extends NativeFileSelectorSpec {
    public static final String TAG = "FileSelector";

    private Promise promise;

    private final String[] formats = new String[]{"png", "jpeg", "jpg", "webp"};
    private PluginAppAPI mPluginApp;

    public FileSelector(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(new ActivityEventListener());
    }

   /* public FileSelector(ReactApplicationContext reactContext, PluginApp pluginApp) {
        super(reactContext);
        Log.i(TAG,"FileSelector addActivityEventListener2");
        this.mPluginApp = pluginApp;
        pluginApp.getReactInstanceManager().getCurrentReactContext().addActivityEventListener(new ActivityEventListener());


    }*/

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }


    @Override
    public void selectImage(Promise promiseImage) {
        Log.i(NAME, "plugin selectImage");
        this.promise = promiseImage;

        Intent intent = new Intent();
        intent.setComponent(new ComponentName("com.ratta.supernote.inbox",
                "com.ratta.supernote.explorer.FileManagerMainActivity"));
        intent.putExtra("source_type", 3);// Fixed value 3
        intent.putExtra("source_app", 2);
        intent.putExtra("suffix_array", formats);
        intent.putExtra("top_title", getCurrentActivity().getString(R.string.Select_image));// Top display name, otherwise will show sleep page selection
        getCurrentActivity().startActivityForResult(intent, 101);
    }


/*    @Override
    public void selectFolder(ReadableArray suffixList, Promise promise) {
        this.promise = promise;
        Intent intent = new Intent();
        intent.setComponent(new ComponentName("com.ratta.supernote.inbox",
                "com.ratta.supernote.explorer.select.SelectFileActivity"));
        intent.putExtra("source_type", 3);// Fixed value 3
        intent.putExtra("source_app", 2);
        if (suffixList.size() > 0) {
            String[] formats = new String[suffixList.size()];
            for (int i = 0; i < suffixList.size(); i++) {
                formats[i] = suffixList.getString(i);
            }
            intent.putExtra("suffix_array", formats);
        }
        intent.putExtra("top_title", getCurrentActivity().getString(R.string.Select_image));// Top display name, otherwise will show sleep page selection
        Bundle dataBundle = intent.getExtras();
        getCurrentActivity().startActivityForResult(intent, 102, dataBundle);


    }*/

    /**
     * Selected file type
     */
    private int selectFileType = 0;

    @Override
    public void selectFile(ReadableMap params, Promise promise) {
        Log.i(NAME, "plugin selectFile");
        this.promise = promise;
        Intent intent = new Intent();
        intent.setComponent(new ComponentName("com.ratta.supernote.inbox",
                "com.ratta.supernote.explorer.SelectFileActivity"));
        intent.putExtra("source_type", 3);// Fixed value 3
        intent.putExtra("source_app", 2);
        if (params.hasKey(SelectFileParamKey.RN_KEY_SELECT_TYPE)) {
            intent.putExtra(SelectFileParamKey.SELECT_KEY_SELECT_TYPE,
                    params.getInt(SelectFileParamKey.RN_KEY_SELECT_TYPE));
            selectFileType = params.getInt(SelectFileParamKey.RN_KEY_SELECT_TYPE);
        }
        if (params.hasKey(SelectFileParamKey.RN_KEY_SUFFIX_LIST)) {
            ReadableArray array = params.getArray(SelectFileParamKey.RN_KEY_SUFFIX_LIST);
            if (array != null && array.size() > 0) {
                String[] suffixes = new String[array.size()];
                for (int i = 0; i < array.size(); i++) {
                    suffixes[i] = array.getString(i);
                }
                intent.putExtra(SelectFileParamKey.SELECT_KEY_SUFFIX_ARRAY,
                        suffixes);
            }
        }
        if (params.hasKey(SelectFileParamKey.RN_KEY_MAX_NUM)) {
            intent.putExtra(SelectFileParamKey.SELECT_KEY_MAX_NUM,
                    params.getInt(SelectFileParamKey.RN_KEY_MAX_NUM));
        }
        if (params.hasKey(SelectFileParamKey.RN_KEY_TITLE)) {
            intent.putExtra(SelectFileParamKey.SELECT_KEY_TITLE,
                    params.getString(SelectFileParamKey.RN_KEY_TITLE));
        }
        if (params.hasKey(SelectFileParamKey.RN_KEY_RIGHT_BUTTON_TEXT)) {
            intent.putExtra(SelectFileParamKey.SELECT_KEY_RIGHT_TXT,
                    params.getString(SelectFileParamKey.RN_KEY_RIGHT_BUTTON_TEXT));
        }
        if (params.hasKey(SelectFileParamKey.RN_KEY_SELECT_PATH_LIST)) {
            ReadableArray array = params.getArray(SelectFileParamKey.RN_KEY_SELECT_PATH_LIST);
            if (array != null && array.size() > 0) {
                String[] pathList = new String[array.size()];
                for (int i = 0; i < array.size(); i++) {
                    pathList[i] = array.getString(i);
                }
                intent.putExtra(SelectFileParamKey.SELECT_KEY_SELECT_PATH, pathList);

            }
        }

        if (params.hasKey(SelectFileParamKey.RN_KEY_NEED_SELECT_FOLDER)) {
            intent.putExtra(SelectFileParamKey.SELECT_KEY_NEED_SELECT_FOLDER,
                    params.getString(SelectFileParamKey.RN_KEY_NEED_SELECT_FOLDER));
        }
        if (params.hasKey(SelectFileParamKey.RN_KEY_LIMIT_PATH)) {
            intent.putExtra(SelectFileParamKey.SELECT_KEY_LIMIT_PATH,
                    params.getString(SelectFileParamKey.RN_KEY_LIMIT_PATH));
        }
        Log.i(TAG,"plugin selectFile intent:"+intent.toString());
        Bundle dataBundle = intent.getExtras();
        HostContext.getInstance().startActivityForResult(intent, 202, dataBundle);


    }

    private class ActivityEventListener implements com.facebook.react.bridge.ActivityEventListener {

        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, @Nullable Intent data) {
            Log.i(TAG, "ActivityEventListener resultCode:" + resultCode + "==" + requestCode);
            if (promise == null) {
                return;
            }

            if (resultCode == Activity.RESULT_OK) {
                if (requestCode == 101) {
                    if (data != null) {
                        String filePath = data.getStringExtra("filePath");
                        Log.i(TAG, "ActivityEventListener filePath:" + filePath);
                        promise.resolve(filePath);
                    } else {
                        promise.resolve("");
                    }
                    return;

                }
                else if (requestCode == 102) {
                    if (data != null) {
                        List<String> filePathList = data.getStringArrayListExtra("filePath");
                        if (filePathList == null || filePathList.isEmpty()) {
                            promise.resolve(null);
                            return;
                        }
                        WritableArray pathArray = Arguments.createArray();
                        for (String path : filePathList) {
                            pathArray.pushString(path);
                        }

                        Log.i(TAG, "ActivityEventListener 102 filePath:" + filePathList);
                        promise.resolve(pathArray);
                    } else {
                        promise.resolve(null);
                    }
                    return;


                } else if (requestCode == 202) {
                    if (data != null) {
                        Bundle bundle = data.getExtras();
                        List<String> filePathList = new ArrayList<>();
                        if (selectFileType == 0 || selectFileType == 2) {
                            List<String> tempList = data.getStringArrayListExtra("filePath");
                            filePathList.addAll(tempList);
                        } else {
                            String filePath = data.getStringExtra("filePath");
                            filePathList.add(filePath);
                        }

                        if (filePathList == null || filePathList.isEmpty()) {
                            promise.resolve(null);
                            return;
                        }
                        WritableArray pathArray = Arguments.createArray();
                        for (String path : filePathList) {
                            pathArray.pushString(path);
                        }

                        Log.i(TAG, "ActivityEventListener 202 filePath:" + filePathList);
                        promise.resolve(pathArray);
                    } else {
                        promise.resolve(null);
                    }
                    return;
                }
            } else {
                promise.resolve(null);
                return;
            }
            promise.reject(new Throwable("select File is error"));

        }

        @Override
        public void onNewIntent(Intent intent) {

        }
    }


}
