package com.ratta.supernote.pluginlib.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.os.Environment;
import android.os.Parcel;
import android.os.Parcelable;
import android.os.StatFs;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.text.TextUtils;
import android.util.Log;

import com.blankj.molihuan.utilcode.util.LogUtils;
import com.ratta.supernote.pluginlib.bean.ExternalStorageBean;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;
import com.ratta.supernote.plugincommon.data.common.trail.Trail;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class FileUtils {
    private static final String TAG = "FileUtils";
    private static final int FILE_HEADER_SIZE = 12;

    // Allowed directories
    public static final String[] rattaDirs = new String[] { "Document/", "EXPORT/", "INBOX/",
            "MyStyle/", "Note/", "SCREENSHOT/" };

    public static String readFile(String filePath) {
        try {
            // Open file input stream
            FileInputStream fis = new FileInputStream(filePath);

            // Read file content
            InputStreamReader isr = new InputStreamReader(fis);
            BufferedReader bufferedReader = new BufferedReader(isr);
            StringBuilder sb = new StringBuilder();
            String line;

            while ((line = bufferedReader.readLine()) != null) {
                sb.append(line).append("\n");
            }

            // Close streams
            bufferedReader.close();
            isr.close();
            fis.close();

            // File content
            String fileContents = sb.toString();
            return fileContents;
        } catch (FileNotFoundException e) {
            // File not found exception handling
            e.printStackTrace();
        } catch (IOException e) {
            // IO exception handling
            e.printStackTrace();
        }
        return null;
    }

    public static boolean deleteDir(String dirPath) {
        File dir = new File(dirPath);
        return deleteDir(dir);

    }

    public static boolean deleteDir(File dir) {
        if (!dir.exists()) {
            return true;
        }
        if (dir.isDirectory()) {
            String[] children = dir.list();
            for (int i = 0; i < children.length; i++) {
                boolean success = deleteDir(new File(dir, children[i]));
                if (!success) {
                    return false;
                }
            }
        }
        return dir.delete();

    }

    public static boolean deleteFile(String filePath) {
        if (TextUtils.isEmpty(filePath)) {
            return true;
        }
        File file = new File(filePath);
        if (file.exists()) {
            return file.delete();
        }
        return true;
    }

    public static boolean moveDirectory(String sourcePath, String destPath) {
        Log.i(TAG, "moveDirectory sourcePath:" + sourcePath + "==" + destPath);
        return moveDirectory(new File(sourcePath), new File(destPath));
    }

    public static boolean moveDirectory(File sourceDir, File destDir) {
        // Ensure source directory exists
        if (!sourceDir.exists() || !sourceDir.isDirectory()) {
            Log.e(TAG, "moveDirectory sourceDir not exists");
            return false;
        }

        // If target directory doesn't exist, try to create it
        if (!destDir.exists()) {
            if (!destDir.mkdirs()) {
                Log.e(TAG, "moveDirectory destDir mk Failed!");
                return false;
            }
        }

        // Get all files and directories under source directory
        File[] files = sourceDir.listFiles();
        if (files == null) {
            Log.e(TAG, "moveDirectory sourceDir null");
            return false;
        }

        for (File file : files) {
            File destFile = new File(destDir, file.getName());
            // If file is directory, move recursively; otherwise, simply rename the file
            if (file.isDirectory()) {
                moveDirectory(file, destFile);
            } else {
                // If the destination exists, delete it first (move will overwrite).
                if (destFile.exists()) {
                    destFile.delete();
                }
                try {
                    // Log.i(TAG, "moveDirectory sourceFile:" + file.toPath() + "==" +
                    // destFile.toPath());

                    Files.move(file.toPath(), destFile.toPath());
                } catch (IOException e) {
                    Log.e(TAG, "moveDirectory error:", e);
                    Log.e(TAG, "moveDirectory rename File Failed! file:" + file.getAbsolutePath() +
                            ", destFile:" + destFile.getAbsolutePath());
                    return false;
                }
            }
        }

        // Finally delete the empty source directory
        return sourceDir.delete();
    }

    public static void moveFile(String sourcePath, String targetPath) throws IOException {
        Path source = Paths.get(sourcePath);
        Path target = Paths.get(targetPath);

        if (!Files.exists(source)) {
            Log.w("FileUtils", "Source file does not exist: " + sourcePath);
            return; // Or throw a custom exception
        }

        // Ensure the target directory exists
        Files.createDirectories(target.getParent());

        Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
    }

    /**
     * Verify if file is a zip file
     * 
     * @param zipPath
     */
    public static boolean checkZip(String zipPath) {
        if (TextUtils.isEmpty(zipPath)) {
            return false;
        }
        return zipPath.endsWith(".zip");
    }

    public static boolean checkSnx(String snxPath) {
        if (TextUtils.isEmpty(snxPath)) {
            return false;
        }
        return snxPath.endsWith(".snplg");
    }

    /**
     * Extract file
     * 
     * @throws IOException
     */
    public static void unZip(String zipFilePath, String targetPath) throws IOException {
        File destDir = new File(targetPath);
        if (!destDir.exists()) {
            destDir.mkdirs();
        }
        File file = new File(zipFilePath);
        FileInputStream fis = new FileInputStream(file);
        ZipInputStream zis = new ZipInputStream(new BufferedInputStream(fis));
        String targetBasePath = targetPath;
        unzip(zis, targetBasePath);
    }

    public static void unzip(ZipInputStream zis, String targetPath) throws IOException {
        ZipEntry entry = zis.getNextEntry();
        if (entry != null) {
            String entryName = entry.getName().replace("\\", "/");
            String filePath = targetPath + File.separator + entryName;
            File file = new File(filePath);

            if (entry.isDirectory()) {
                // Empty directory may exist
                if (!file.exists()) {
                    file.mkdirs();
                }
                unzip(zis, targetPath);
            } else {
                File parentFile = file.getParentFile();
                if (parentFile != null && !parentFile.exists()) {
                    parentFile.mkdirs();
                }
                FileOutputStream fos = null;
                try {
                    fos = new FileOutputStream(file);// Parent path must exist when creating file with output stream
                    int len = 0;
                    byte[] buf = new byte[1024];
                    while ((len = zis.read(buf)) != -1) {
                        fos.write(buf, 0, len);
                    }
                    fos.flush();

                } catch (Exception ex) {
                } finally {
                    if (fos != null) {
                        fos.close();
                    }
                }
                zis.closeEntry();
                unzip(zis, targetPath);
            }
        }
    }

    /// Get filename with extension
    public static String getFileNameSuffix(String path) {
        boolean b = path.contains("/");
        int start = 0;
        if (b) {
            start = path.lastIndexOf("/");
        }
        if (start != -1) {
            if (b) {
                return path.substring(start + 1);
            } else {
                return path.substring(start);
            }
        } else {

            return null;
        }
    }

    public static String getFileName(String path) {

        boolean b = path.contains("/");
        int start = 0;
        if (b) {
            start = path.lastIndexOf("/");
        }

        int end = path.lastIndexOf(".");

        if (start != -1 && end != -1) {

            if (b) {
                return path.substring(start + 1, end);
            } else {
                return path.substring(start, end);
            }

        } else {

            return null;
        }
    }

    public static String getImageFormat(String filePath) {
        FileInputStream fis = null;
        try {
            fis = new FileInputStream(filePath);
            byte[] fileHeader = new byte[FILE_HEADER_SIZE];
            if (fis.read(fileHeader, 0, FILE_HEADER_SIZE) != -1) {
                String fileHeaderStr = new String(fileHeader, 0, FILE_HEADER_SIZE);
                if (isJPEG(fileHeader)) {
                    Log.i(TAG, "getImageFormat: JPEG");
                    return "JPEG";
                } else if (isPNG(fileHeader)) {
                    Log.i(TAG, "getImageFormat: PNG");
                    return "PNG";
                } else if (fileHeaderStr.startsWith("RIFF") && fileHeaderStr.endsWith("WEBP")) {
                    Log.i(TAG, "getImageFormat: WEBP");
                    return "WEBP";
                }
                // else if (fileHeaderStr.startsWith(TIFF_HEADER)) {
                // Log.i(TAG, "getImageFormat: TIFF");
                // return "TIFF";
                // } else if (fileHeaderStr.startsWith(SVG_HEADER)) {
                // Log.i(TAG, "getImageFormat: SVG");
                // return "SVG";
                // } else if (startsWith(fileHeader, "GIF87a".getBytes()) ||
                // startsWith(fileHeader, "GIF89a".getBytes())) {
                // Log.i(TAG, "getImageFormat: GIF");
                // return "GIF";
                // } else if (fileHeaderStr.startsWith(BMP_HEADER)) {
                // Log.i(TAG, "getImageFormat: BMP");
                // return "BMP";
                // }
            }

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (fis != null) {
                try {
                    fis.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
        return "";
    }

    private static boolean isJPEG(byte[] magicNumber) {
        return magicNumber[0] == (byte) 0xFF && magicNumber[1] == (byte) 0xD8;
    }

    private static boolean isPNG(byte[] magicNumber) {
        byte[] pngMagicNumber = { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        for (int i = 0; i < pngMagicNumber.length; i++) {
            if (magicNumber[i] != pngMagicNumber[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get bundle filename from directory
     * 
     * @param dirPath
     * @return
     */
    public static String getBundleFileName(String dirPath) {
        if (TextUtils.isEmpty(dirPath)) {
            return null;
        }
        File dir = new File(dirPath);
        // Directory cannot exist
        if (!dir.exists()) {
            return null;
        }
        // Get all files and directories under source directory
        File[] files = dir.listFiles();
        // No files in directory
        if (files == null) {
            return null;
        }

        for (File file : files) {
            if (file.isFile()) {
                String fileName = file.getName();
                if (fileName.endsWith(".bundle")) {
                    return fileName;
                }
            }
        }
        return null;
    }

    public static boolean isFileExists(String filePath) {
        if (TextUtils.isEmpty(filePath)) {
            return false;
        }
        File file = new File(filePath);
        return file.exists();
    }

    public static void copyFile(String sourcePath, String destinationPath) throws IOException {
        FileInputStream inputStream = null;
        FileOutputStream outputStream = null;
        try {
            inputStream = new FileInputStream(sourcePath);
            outputStream = new FileOutputStream(destinationPath);

            byte[] buffer = new byte[1024];
            int length;
            while ((length = inputStream.read(buffer)) > 0) {
                outputStream.write(buffer, 0, length);
            }
        } finally {
            if (inputStream != null) {
                inputStream.close();
            }
            if (outputStream != null) {
                outputStream.close();
            }
        }
    }

    public static String getFileMD5(String filePath) {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("MD5");
            InputStream is = new FileInputStream(filePath);

            byte[] buffer = new byte[1024];
            int read = 0;
            while ((read = is.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            is.close();

            byte[] md5Bytes = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte md5Byte : md5Bytes) {
                hexString.append(Integer.toString((md5Byte & 0xFF) + 0x100, 16).substring(1));
            }
            return hexString.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static boolean saveBitmapToPng(Bitmap bitmap, String filePath) {
        try {
            FileOutputStream fileOutputStream = new FileOutputStream(filePath);
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fileOutputStream);
            fileOutputStream.flush();
            fileOutputStream.close();
            return true;
        } catch (Exception e) {
            e.printStackTrace();

        }
        return false;
    }

    /**
     * Get parent directory path of file
     * 
     * @param filePath
     * @return
     */
    public static String getParentDirPath(String filePath) {
        if (TextUtils.isEmpty(filePath)) {
            return "";
        }
        String dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
        return dirPath;
    }

    public static void mkdir(String dirPath) {
        File dir = new File(dirPath);
        if (!dir.exists()) {
            Log.i(TAG, "mkdir dir no:");
            dir.mkdirs();
        }
    }

    public static boolean saveTextToFile(String filePath, String text) {
        deleteFile(filePath);
        FileOutputStream outputStream = null;
        boolean isSucceed = false;

        try {
            String dirPath = getParentDirPath(filePath);
            Log.i(TAG, "saveTextToFile dirPath:" + dirPath);
            mkdir(dirPath);
            outputStream = new FileOutputStream(filePath);
            outputStream.write(text.getBytes());

        } catch (IOException e) {
            e.printStackTrace();

        } finally {
            try {
                if (outputStream != null) {
                    outputStream.close();
                    isSucceed = true;
                }

            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        return isSucceed;

    }

    public static long getStorageAvailableSpace() {
        String absolutePath = Environment.getExternalStorageDirectory().getAbsolutePath();
        StatFs statFs = new StatFs(absolutePath);
        long blockSize = statFs.getBlockSizeLong();
        long availCount = statFs.getAvailableBlocksLong();
        long availableSize = availCount * blockSize;
        return availableSize;
    }

    /**
     * Get SD card path for new device
     * 
     * @param context
     * @return
     */
    public static String getSDCardDir(Context context) {
        try {
            String sdcardDir = null;
            StorageManager storageManager = (StorageManager) context.getSystemService(Context.STORAGE_SERVICE);
            Class<?> volumeInfoClazz = null;
            Class<?> diskInfoClazz = null;
            diskInfoClazz = Class.forName("android.os.storage.DiskInfo");
            Method isSd = diskInfoClazz.getMethod("isSd");// isUsb、isSd
            volumeInfoClazz = Class.forName("android.os.storage.VolumeInfo");
            Method getType = volumeInfoClazz.getMethod("getType");

            Method getDisk = volumeInfoClazz.getMethod("getDisk");
            Field path = volumeInfoClazz.getDeclaredField("path");
            Method getVolumes = storageManager.getClass().getMethod("getVolumes");
            Method getDescription = volumeInfoClazz.getMethod("getDescription");
            List<Class<?>> result = (List<Class<?>>) getVolumes.invoke(storageManager);
            if (result == null) {
                return null;
            }
            for (int i = 0; i < result.size(); i++) {
                Object volumeInfo = result.get(i);
                int deviceType = 0;
                if (getType != null) {
                    deviceType = (int) getType.invoke(volumeInfo);
                }
                // LogUtils.d( "insert type：" + deviceType);
                if (deviceType == 0) {
                    Object disk = getDisk.invoke(volumeInfo);
                    if (disk != null && isSd != null) {
                        if ((boolean) isSd.invoke(disk)) {
                            sdcardDir = (String) path.get(volumeInfo);
                            String description = (String) getDescription.invoke(volumeInfo);
                            // LogUtils.d( "description:" + description);
                            break;
                        }
                    }
                }
            }
            if (sdcardDir == null) {
                // LogUtils.d( "sdcardDir null");
                return null;
            } else {
                // LogUtils.i( "sdcardDir " + sdcardDir + File.separator);
                return sdcardDir;
            }
        } catch (Exception e) {
            // LogUtils.i("sdcardDir e " + e.getMessage());
            e.printStackTrace();
        }
        // LogUtils.w( "sdcardDir null");
        return null;
    }

    private static String getOTGNameByPath(Context context, String path) {
        StorageManager mStorageManager = context.getSystemService(StorageManager.class);
        List<StorageVolume> volumeList = mStorageManager.getStorageVolumes();
        String mPath = null; // Device path
        for (StorageVolume volume : volumeList) {
            if (null != volume && volume.isRemovable()) {
                String label = volume.getDescription(context); // This is the USB drive name
                // String status = volume.getState(); // Device mount status, e.g.: mounted,
                // unmounted
                // boolean isEmulated = volume.isEmulated(); // Whether it's internal storage
                // device
                // boolean isRemovable = volume.isRemovable(); // Whether it's removable
                // external storage device
                try {
                    Class myclass = Class.forName(volume.getClass().getName());
                    Method getPath = myclass.getDeclaredMethod("getPath");
                    getPath.setAccessible(true);
                    mPath = (String) getPath.invoke(volume);
                    if (path.equals(mPath)) {
                        return label;
                    }
                } catch (ClassNotFoundException | NoSuchMethodException | InvocationTargetException
                        | IllegalAccessException e) {
                    e.printStackTrace();
                }
            }
        }
        return mPath;
    }

    /**
     * Get storage volume type
     */
    public static List<ExternalStorageBean> getStorageType(Context mContext) {
        // value 0 for OTG, 1 for TF card
        List<ExternalStorageBean> externalStorageBeanList = new ArrayList<>();
        try {
            StorageManager storageManager = (StorageManager) mContext.getSystemService(Context.STORAGE_SERVICE);
            // Get storage type (USB drive or SD card)
            final Method getVolumes = storageManager.getClass().getMethod("getVolumes");
            final List<Object> invokeVolumes = (List<Object>) getVolumes.invoke(storageManager);
            final Class<?> volumeInfoClazz = Class.forName("android.os.storage.VolumeInfo");
            final Method getPath = volumeInfoClazz.getMethod("getPath");
            final Method getDisk = volumeInfoClazz.getMethod("getDisk");
            final Class<?> diskInfoClazz = Class.forName("android.os.storage.DiskInfo");
            final Method getDescription = diskInfoClazz.getMethod("getDescription");
            if (invokeVolumes == null) {
                return externalStorageBeanList;
            }
            String sdCardDir = getSDCardDir(mContext);
            for (int i = 0; i < invokeVolumes.size(); i++) {
                final Object volumeInfo = invokeVolumes.get(i);
                File invokePath = (File) getPath.invoke(volumeInfo);
                if (invokePath == null || !invokePath.exists()) {
                    continue;
                }
                LogUtils.d("invokePath:" + invokePath.getPath() + " - sdCardDir: " + sdCardDir);
                if ("/data".equals(invokePath.getPath()) || "/storage/emulated".equals(invokePath.getPath())) {
                    continue;
                }
                Object invokeDiskInfo = getDisk.invoke(volumeInfo);
                String description = (String) getDescription.invoke(invokeDiskInfo);
                // LogUtils.d("volumeInfo.getClass(): " + volumeInfo.getClass());
                // Integer state = (Integer)
                // volumeInfo.getClass().getMethod("getState").invoke(volumeInfo);

                // LogUtils.d( "getPath:" + invokePath.getPath());
                // LogUtils.d( "getDescription:" + description);
                // LogUtils.d("state: " + state);
                String path = invokePath.getPath();
                Log.d("", "getStorageType path: " + path);
                if (sdCardDir != null && invokePath.getPath().equals(sdCardDir)) {
                    // String tfCardName = getTfCardName(mContext);// This method returns OTG name
                    // when both OTG and TF card exist
                    String tfCardName = getOTGNameByPath(mContext, path);
                    LogUtils.d("getStorageType tfCardName: " + tfCardName);
                    if (TextUtils.isEmpty(tfCardName)) {
                        tfCardName = new File(path).getName();
                    }
                    externalStorageBeanList.add(new ExternalStorageBean(1, tfCardName, path));
                    // map.put(1,invokePath.getPath());
                } else {
                    String otgName = getOTGNameByPath(mContext, path);
                    LogUtils.d("getStorageType otgNameByPath: " + otgName);
                    if (TextUtils.isEmpty(otgName)) {
                        otgName = new File(path).getName();
                    }
                    externalStorageBeanList.add(new ExternalStorageBean(0, otgName, path));
                    // map.put(0, invokePath.getPath());
                }
            }

        } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException
                | ClassNotFoundException e) {
            e.printStackTrace();
        }
        return externalStorageBeanList;
    }

    /**
     * Saves stroke data to a temporary file.
     * 
     * @param tempFile
     * @param trails
     * @return
     */
    public static void saveTrailsAsTemp(File tempFile, List<Trail> trails) throws IOException {

        // Serialize via Parcel
        Parcel parcel = Parcel.obtain();
        try {
            // Write list size
            parcel.writeInt(trails.size());
            // Write each Trail object
            for (Object trail : trails) {
                if (trail instanceof Parcelable) {
                    parcel.writeParcelable((Parcelable) trail, 0);
                } else {
                    throw new IllegalArgumentException("Object is not Parcelable: " + trail.getClass());
                }
            }

            // Write Parcel bytes to file
            byte[] data = parcel.marshall();
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(data);
                fos.flush();
            }

        } finally {
            parcel.recycle();
        }
    }

    public static boolean isValidPath(Context context, PluginAppAPI pluginApp, String path, String suffix) {
        Log.i(TAG, "isValidPath path:" + path);

        // Check whether the path is empty/null
        if (TextUtils.isEmpty(path)) {
            return false;
        }

        // Check path length (Android path length limits)
        if (path.length() > 4096) {
            return false;
        }

        // Check for illegal traversal patterns
        if (path.contains("..") || path.contains("//")) {
            return false;
        }

        // Check file suffix
        if (!path.toLowerCase().endsWith(suffix)) {
            return false;
        }

        String pluginPath = pluginApp.getPluginPath() + File.separator;
        // Check whether the path is allowed
        boolean isRight = false;
        if (path.startsWith(pluginPath)) {
            isRight = true;
        }

        if (!isRight) {
            String storageDir = Environment.getExternalStorageDirectory() + File.separator;
            String sdcardDir = "/sdcard/";

            // Check whether it is under one of the allowed directories
            for (String rattaDir : rattaDirs) {
                Log.i(TAG, "isValidPath storageDir:" + (storageDir + rattaDir));
                Log.i(TAG, "isValidPath sdcardDir:" + (sdcardDir + rattaDir));

                if (path.startsWith(storageDir + rattaDir)
                        || path.startsWith(sdcardDir + rattaDir)) {
                    isRight = true;
                    break;
                }

            }
        }
        if (!isRight) {
            List<ExternalStorageBean> storageType = getStorageType(context);
            if (storageType != null && storageType.size() > 0) {
                for (ExternalStorageBean externalStorageBean : storageType) {
                    if (path.startsWith(externalStorageBean.getPath())) {
                        isRight = true;
                        break;
                    }
                }
            }
        }
        // Not in an allowed directory
        if (!isRight) {
            return false;
        }

        try {
            // Check whether the parent directory exists or can be created
            File file = new File(path);
            File parentDir = file.getParentFile();

            if (parentDir != null) {
                // If the parent directory does not exist, check whether it can be created
                if (!parentDir.exists()) {
                    // Check write permission for the parent directory path (basic check)
                    String parentPath = parentDir.getAbsolutePath();
                    if (parentPath.startsWith("/system/") ||
                            parentPath.startsWith("/root/") ||
                            parentPath.startsWith("/proc/") ||
                            parentPath.startsWith("/dev/")) {
                        return false; // System directories are not writable
                    }
                }
            }

            // Check file name for illegal characters
            String fileName = file.getName();
            if (fileName.contains(":") || fileName.contains("*") ||
                    fileName.contains("?") || fileName.contains("\"") ||
                    fileName.contains("<") || fileName.contains(">") ||
                    fileName.contains("|")) {
                return false;
            }

        } catch (Exception e) {
            // Treat path parsing errors as invalid paths
            return false;
        }

        return true;
    }

    public static boolean isValidStickerPath(String stickerPath) {
        if (TextUtils.isEmpty(stickerPath)) {
            return false;
        }
        File file = new File(stickerPath);
        if (file.isDirectory()) {
            return false;
        }
        return stickerPath.endsWith(".sticker");
    }

    public static boolean isBundleFile(String bundlePath) {
        if (TextUtils.isEmpty(bundlePath)) {
            return false;
        }
        if (!bundlePath.endsWith(".bundle")) {
            return false;
        }
        File file = new File(bundlePath);
        if (file.isDirectory()) {
            return false;
        }
        return file.exists();
    }

    public static boolean isNote(String path) {
        if (TextUtils.isEmpty(path)) {
            return false;
        }
        return path.toLowerCase().endsWith(".note");

    }

}
