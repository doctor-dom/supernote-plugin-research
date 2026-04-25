package com.ratta.supernote.pluginlib.modules;

import static android.content.Intent.FLAG_ACTIVITY_NEW_TASK;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Environment;
import android.os.storage.StorageManager;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.ratta.supernote.pluginlib.NativeFileUtilsSpec;
import com.ratta.supernote.pluginlib.api.HostContext;
import com.ratta.supernote.pluginlib.api.HostDataCacheAPI;
import com.ratta.supernote.pluginlib.bean.ExternalStorageBean;
import com.ratta.supernote.pluginlib.jni.NativeJNI;
import com.ratta.supernote.pluginlib.modules.bean.ImageInfo;
import com.ratta.supernote.pluginlib.utils.BitmapUtils;
import com.ratta.supernote.pluginlib.utils.FileUtils;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class RTNFileModule extends NativeFileUtilsSpec {

    private final String TAG ="RTNFileModule";


    private static final int THREAD_SIZE_4 = 4;
    private ExecutorService mThreadPool = Executors.newFixedThreadPool(THREAD_SIZE_4);
    private final String[] formats = new String[]{"png", "jpeg", "jpg", "webp"};


    public abstract class SearchImageTask implements Runnable {
        private static final String TAG = "SearchImageTask";
        private String[] fileSuffix = {"png", "jpg", "jpeg", "webp"};
        private String rootPath;

        public SearchImageTask(String rootPath, String[] fileSuffix) {
            this.rootPath = rootPath;
            this.fileSuffix = fileSuffix;
        }

        @Override
        public void run() {

//        Log.i(TAG,"SearchImageTask "+ Thread.currentThread().getId());
            NativeJNI jni = new NativeJNI();
            List<String> list = new ArrayList<>();
            Log.i(TAG, "fileSuffix:" + fileSuffix[0]);
            jni.getFilePath(rootPath, fileSuffix, list);
            Log.i(TAG, "rootPath:" + rootPath + "size:" + list.size());
            searchImageFinish(rootPath, list);
        }

        protected abstract void searchImageFinish(String root, List<String> list);


    }

    public RTNFileModule(ReactApplicationContext reactContext) {
        super(reactContext);
        Log.i(NAME, "RTNFileModule new");
    }

    @Override
    public void exists(String filePath, Promise promise) {
        Log.i(NAME, "RTNFileModule exists filePath:" + filePath);
        if (TextUtils.isEmpty(filePath)) {
            promise.resolve(false);
            return;
        }

        File file = new File(filePath);
        boolean isExists = file.exists();
        Log.i(NAME, "RTNFileModule exists isExists:" + isExists);
        promise.resolve(isExists);

    }

    @Override
    public void getExternalDirPath(Promise promise) {
        Log.i(NAME, "getExternalDirPath");
        StorageManager sm = (StorageManager) getCurrentActivity().getSystemService(Context.STORAGE_SERVICE);
        try {
            Method getVolumePaths = StorageManager.class.getMethod("getVolumePaths", new Class[0]);
            String[] invoke = (String[]) getVolumePaths.invoke(sm, new Object[]{});
            if (invoke != null && invoke.length > 0) {
                WritableArray pathArray = Arguments.createArray();

                for (String path : invoke) {
                    pathArray.pushString(path);
                }
                promise.resolve(pathArray);
            } else {
                promise.resolve(null);
            }
        } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException e) {
            e.printStackTrace();
            promise.reject(e);
        }

    }

    /**
     * Create directory
     */
    @Override
    public void makeDir(String dirPath, Promise promise) {
        Log.i(NAME, "makeDir dirPath:" + dirPath);
        File dir = new File(dirPath);
        if (dir.exists() && dir.isDirectory()) {
            Log.i(NAME, "makeDir dirPath exists:");
            promise.resolve(true);
        } else {
            Log.i(NAME, "makeDir dirPath not exists:");
            promise.resolve(dir.mkdirs());
        }
    }

    @Override
    public void getExportPath(Promise promise) {
        Log.i(NAME, "getExportPath");
        promise.resolve(Environment.getExternalStorageDirectory() + File.separator + "EXPORT");

    }

    @Override
    public void renameToFile(String sourceFile, String destFile, Promise promise) {
        Log.i(NAME, "renameToFile");
        File source = new File(sourceFile);
        if (!source.exists()) {
            promise.reject(new Throwable("File is not exists"));
        }
        File dest = new File(destFile);

        promise.resolve(source.renameTo(dest));

    }

    @Override
    public void copyFile(String sourcePath, String destPath, Promise promise) {
        Log.i(NAME, "renameToFile sourcePath:"+sourcePath+", destPath:"+destPath);
        try {
            FileUtils.copyFile(sourcePath, destPath);
            promise.resolve(true);
        } catch (IOException e) {
            promise.reject(e);
            Log.e(NAME, e.toString());
        }
    }

    @Override
    public void listFiles(String dirPath, Promise promise) {
        Log.i(NAME, "listFiles dirPath:"+dirPath);
        File dir = new File(dirPath);
        if (!dir.exists()) {
            promise.reject(new Throwable("Dir is not exists"));
            return;
        }
        if (!dir.isDirectory()) {
            promise.reject(new Throwable("Not Did"));
            return;
        }
        File[] files = dir.listFiles();
        if (files == null || files.length == 0) {
            // Empty directory
            promise.resolve(null);
            return;

        }

        WritableArray fileArray = Arguments.createArray();
        for (File file : files) {
            WritableMap fileMap = Arguments.createMap();
            fileMap.putString("path", file.getPath());
            // Type 0: Directory, 1: File
            fileMap.putInt("type", file.isDirectory() ? 0 : 1);
            fileArray.pushMap(fileMap);
        }
        promise.resolve(fileArray);

    }


    @Override
    public void getFileMD5(String filePath, Promise promise) {
        Log.i(NAME, "getFileMD5 filePath:" + filePath);
        String md5 = FileUtils.getFileMD5(filePath);
        Log.i(NAME, "getFileMD5 md5:" + md5);
        if (TextUtils.isEmpty(md5)) {
            promise.resolve("");
        } else {
            promise.resolve(md5);
        }
    }

    @Override
    public void deleteFile(String filePath, Promise promise) {
        Log.i(NAME, "deleteFile filePath:"+filePath);
        File file = new File(filePath);
        if (file.exists()) {
            promise.resolve(file.delete());
        } else {
            promise.resolve(true);
        }
    }

    @Override
    public void deleteDir(String dirPath, Promise promise) {
        Log.i(NAME, "deleteDir dirPath:"+dirPath);
        promise.resolve(FileUtils.deleteDir(dirPath));

    }

    @Override
    public void getFileList(ReadableArray suffixList, Promise promise) {
        if (suffixList == null || suffixList.size() <= 0) {
            promise.reject(new Throwable("suffix is null"));
            return;
        }
        Log.i(NAME,"getFileList  suffixList:"+suffixList.getString(0));

        String[] formats = new String[suffixList.size()];
        for (int i = 0; i < suffixList.size(); i++) {
            formats[i] = suffixList.getString(i);
        }


        List<String> pathList = new ArrayList<>();
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "Document");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "EXPORT");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "INBOX");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "MyStyle");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "Note");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "SCREENSHOT");
        List<ExternalStorageBean> storageType = FileUtils.getStorageType(getCurrentActivity());
        for (ExternalStorageBean externalStorageBean : storageType) {
            pathList.add(externalStorageBean.getPath());
        }

        /*String sdcardPath = getExternalImageFile();
        if(!TextUtils.isEmpty(sdcardPath)) {
            pathList.add(sdcardPath);
        }*/


        List<List<String>> resultList = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch taskLatch = new CountDownLatch(pathList.size());
        if (mThreadPool.isShutdown()) {
            mThreadPool = Executors.newFixedThreadPool(THREAD_SIZE_4);
        }

        mThreadPool.execute(new Runnable() {

            @Override
            public void run() {
                try {
                    taskLatch.await();
                    List<ImageInfo> imageInfoList = new ArrayList<>();
                    List<String> oriList = new ArrayList<>();
                    for (int i = 0; i < resultList.size(); i++) {
                        List<String> list = resultList.get(i);
                        if (list != null && list.size() > 0) {
                            oriList.addAll(list);
                        }
                    }

                    for (String pathStr : oriList) {
                        imageInfoList.add(new ImageInfo(pathStr));
                    }

                    // Sort
                    for (ImageInfo info : imageInfoList) {
                        info.setAz(info.getName().matches("^[0-9a-zA-z].*"));
                        info.setSpecial(info.getName().matches("^[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】‘；：”“’。，、？].*"));
                    }
                    imageInfoList.sort(new ImageInfo.PictureNameComparator(true));
                    Log.i(NAME, "getImageList length:" + imageInfoList.size());
                    WritableArray imageArray = Arguments.createArray();
                    for (ImageInfo info : imageInfoList) {
                        WritableMap writableMap = Arguments.createMap();
                        writableMap.putString("path", info.getPath());
                        writableMap.putString("name", info.getName());
                        imageArray.pushMap(writableMap);
                    }
                    promise.resolve(imageArray);


                } catch (InterruptedException e) {
                    promise.reject(e);
                }
            }
        });

        for (int i = 0; i < pathList.size(); i++) {
            mThreadPool.execute(new SearchImageTask(pathList.get(i), formats) {
                @Override
                protected void searchImageFinish(String root, List<String> list) {
                    resultList.add(new ArrayList<>(list));
                    taskLatch.countDown();
                }
            });
        }

    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    @Override
    public void getImageList(Promise promise) {
        List<String> pathList = new ArrayList<>();
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "Document");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "EXPORT");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "INBOX");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "MyStyle");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "Note");
        pathList.add(Environment.getExternalStorageDirectory() + File.separator + "SCREENSHOT");
        List<ExternalStorageBean> storageType = FileUtils.getStorageType(getCurrentActivity());
        for (ExternalStorageBean externalStorageBean : storageType) {
            pathList.add(externalStorageBean.getPath());
        }

        /*String sdcardPath = getExternalImageFile();
        if(!TextUtils.isEmpty(sdcardPath)) {
            pathList.add(sdcardPath);
        }*/


        List<List<String>> resultList = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch taskLatch = new CountDownLatch(pathList.size());
        if (mThreadPool.isShutdown()) {
            mThreadPool = Executors.newFixedThreadPool(THREAD_SIZE_4);
        }

        mThreadPool.execute(new Runnable() {

            @Override
            public void run() {
                try {
                    taskLatch.await();
                    List<ImageInfo> imageInfoList = new ArrayList<>();
                    List<String> oriList = new ArrayList<>();
                    for (int i = 0; i < resultList.size(); i++) {
                        List<String> list = resultList.get(i);
                        if (list != null && list.size() > 0) {
                            oriList.addAll(list);
                        }
                    }
                    Log.i(TAG, "getImageList oriList length:" + oriList.size());
                    Log.i(TAG, "getImageList oriList:" + oriList);

                    for (String pathStr : oriList) {
                        // Get image format
                        String format = FileUtils.getImageFormat(pathStr);

                        if (format.length() > 0 && !BitmapUtils.isBitmapOutOf2560(pathStr)) {
                            imageInfoList.add(new ImageInfo(pathStr));
                        }
                    }

                    // Sort
                    for (ImageInfo info : imageInfoList) {
                        info.setAz(info.getName().matches("^[0-9a-zA-z].*"));
                        info.setSpecial(info.getName().matches("^[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】‘；：”“’。，、？].*"));
                    }
                    imageInfoList.sort(new ImageInfo.PictureNameComparator(true));
                    Log.i(TAG, "getImageList length:" + imageInfoList.size());
                    WritableArray imageArray = Arguments.createArray();
                    for (ImageInfo info : imageInfoList) {
                        WritableMap writableMap = Arguments.createMap();
                        writableMap.putString("path", info.getPath());
                        writableMap.putString("name", info.getName());
                        imageArray.pushMap(writableMap);
                    }
                    promise.resolve(imageArray);


                } catch (InterruptedException e) {
                    promise.reject(e);
                }
            }
        });

        for (int i = 0; i < pathList.size(); i++) {
            mThreadPool.execute(new SearchImageTask(pathList.get(i),formats ) {
                @Override
                protected void searchImageFinish(String root, List<String> list) {
                    resultList.add(new ArrayList<>(list));
                    taskLatch.countDown();
                }
            });
        }

    }

    @Override
    public void openFilePath(String path, Promise promise) {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName("com.ratta.supernote.inbox",
                "com.ratta.supernote.explorer.FileManagerMainActivity"));
        if(!TextUtils.isEmpty(HostDataCacheAPI.getInstance().getCurrentFilePath())) {
            intent.putExtra("folder_path", HostDataCacheAPI.getInstance().getCurrentFilePath());
        }
        intent.putExtra("source_type", 2);
        intent.putExtra("only_open_file", path);
        intent.setAction(Intent.ACTION_VIEW);
        HostContext.getInstance().startActivity(intent);
        promise.resolve(true);

    }

    @Override
    public void getStorageAvailableSpace(Promise promise) {
        long availableSize = FileUtils.getStorageAvailableSpace();
        Log.i(NAME,"getStorageAvailableSpace availableSize:"+availableSize);
        promise.resolve((double)availableSize);

    }
}
