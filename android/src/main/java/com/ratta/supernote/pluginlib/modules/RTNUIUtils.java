package com.ratta.supernote.pluginlib.modules;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.ratta.supernote.pluginlib.NativeUIUtilsSpec;
import com.ratta.supernote.pluginlib.api.HostUIAPI;
import com.ratta.supernote.pluginlib.callback.RattaDialogListener;

public class RTNUIUtils extends NativeUIUtilsSpec {
    

    public RTNUIUtils(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public void showErrorTipDialog(String tag) {
        HostUIAPI.getInstance().showTipDialog(getCurrentActivity(), false, tag, new RattaDialogListener() {
            @Override
            public void onConfirm() {

            }

            @Override
            public void onCancel() {

            }
        });

    }

    @Override
    public void showRattaDialog(String tip, String letBtnTxt, String rightBtnTxt, boolean isSuccess, Promise promise) {
        HostUIAPI.getInstance().showRattaDialog(getCurrentActivity(), tip, letBtnTxt, rightBtnTxt, isSuccess, new RattaDialogListener() {
            @Override
            public void onConfirm() {
                promise.resolve(true);

            }

            @Override
            public void onCancel() {
                promise.resolve(false);

            }
        });
    }
}
