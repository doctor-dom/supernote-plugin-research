package com.ratta.supernote.pluginlib.utils;

import android.content.Context;
import android.text.TextUtils;
import android.util.Log;

import java.io.File;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import dalvik.system.DexClassLoader;

/**
 * Utils for reading Dex files
 */
public class DexUtils {

    private static final String TAG ="DexUtils";


    /**
     * Cache for DexClassLoader
     */
    public static final Map<String, DexClassLoader> mDexClassLoaderMap = new ConcurrentHashMap<>();


    /**
     * Get RN package from Dex, used for loading third-party RN packages
     *
     * @param context
     * @param packageClassName RN package class name
     * @param dexPath
     * @param soDirPath
     * @return
     */
    public static Object getDexRNPackage(Context context, ClassLoader parentClassLoader,String packageClassName, String dexPath, String soDirPath) {
        Log.i(TAG,"getDexRNPackage packageClassName:"+packageClassName+"=="
        +dexPath+"=="+soDirPath);
        if(TextUtils.isEmpty(dexPath)) {
            return null;
        }
        File dexFile = new File(dexPath);
        if(!dexFile.exists() || dexFile.isDirectory()) {
            return null;
        }

        String key = generatedClassLoaderKey(dexPath, soDirPath);
        DexClassLoader dexClassLoader = mDexClassLoaderMap.get(key);
        if(dexClassLoader == null) {
            dexClassLoader = new DexClassLoader(dexPath, context.getCacheDir().getAbsolutePath(), soDirPath, parentClassLoader);
            mDexClassLoaderMap.put(key, dexClassLoader);
        }
        try {
            Class<?> clazz = dexClassLoader.loadClass(packageClassName);
            Object packageInstance = clazz.newInstance();
            return packageInstance;

        } catch (ClassNotFoundException | InstantiationException | IllegalAccessException e) {
            Log.e(TAG, "getDexRNPackage error:"+e.toString());
        }

        return  null;

    }

    /**
     * Load third-party dex files, Package dex depends on third-party dex, so need to load in advance
     * @param parentClassLoader
     * @param dexPath
     * @param soDirPath
     */
    public static ClassLoader loadPluginDex(Context context, ClassLoader parentClassLoader, String dexPath, String soDirPath) {
        if(TextUtils.isEmpty(dexPath)) {
            return null;
        }
        File dexFile = new File(dexPath);
        if(!dexFile.exists() || dexFile.isDirectory()) {
            return null;
        }

        String key = generatedClassLoaderKey(dexPath, soDirPath);
        DexClassLoader dexClassLoader = mDexClassLoaderMap.get(key);
        if(dexClassLoader == null) {
            dexClassLoader = new DexClassLoader(dexPath, context.getCacheDir().getAbsolutePath(), soDirPath, parentClassLoader);
            mDexClassLoaderMap.put(key, dexClassLoader);
        }
        Log.i(TAG,"loadPluginDex dexPAth:"+dexPath);
        Log.i(TAG,"loadPluginDex dexClassLoader:"+dexClassLoader);
        return  dexClassLoader;

    }

    /**
     * Generate key value for classLoader
     * @param dexPath
     * @param soDirPath
     * @return
     */
    private static String generatedClassLoaderKey(String dexPath, String soDirPath) {
        return dexPath+"-"+soDirPath;

    }
}
