package com.ratta.supernote.pluginlib.api;

import android.content.Context;
import android.graphics.Rect;
import android.os.Bundle;
import android.util.Size;
import android.util.SizeF;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.ratta.supernote.pluginlib.callback.RequestHostCallback;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;
import com.ratta.supernote.plugincommon.response.PluginAPIResponse;

import java.util.List;

/**
 * Common plugin APIs for accessing local host data (e.g., note strokes).
 */
public abstract class HostCommonAPI {
    private final static String TAG = "HostCommonAPI";
    private static HostCommonAPI instance;

    public static HostCommonAPI getInstance() {
        return instance;
    }

    public HostCommonAPI() {
    }

    public static void init(HostCommonAPI hostCommonAPI) {
        instance = hostCommonAPI;
    }



        /**
     * Gets eMRMax XY.
     */
    public abstract int[] getEMRMaxXY();

    /**
     * Get thumbnail dimensions
     * @param stickerPath
     * @return
     */
    public abstract void getStickerRect(PluginAppAPI pluginApp, String stickerPath, RequestHostCallback callback);

    public abstract void saveSticker(PluginAppAPI pluginApp, String path, RequestHostCallback callback);

        /**
     * Saves sticker.
     */
    public abstract void saveSticker(PluginAppAPI pluginApp, String path, Rect rect, RequestHostCallback callback);

    /**
     * Generate thumbnail
     * @param stickerPath Sticker path
     * @param thumbnailPath Generated thumbnail path
     * @return
     */
    public abstract void generateStickerThumbnail(PluginAppAPI pluginApp, String stickerPath,
                                                  String thumbnailPath, ReadableMap size,
                                                  RequestHostCallback callback);


    public abstract void insertSticker(PluginAppAPI pluginApp, String path, RequestHostCallback callback);

        /**
     * Sets lasso Box State.
     */
    public abstract void setLassoBoxState(PluginAppAPI pluginApp, int state, RequestHostCallback callback);

        /**
     * Gets lasso Rect.
     */
    public abstract void getLassoRect(PluginAppAPI pluginApp, RequestHostCallback callback);

    public abstract void updateLassoRect(PluginAppAPI pluginApp, ReadableMap rectMap, RequestHostCallback callback);

    public abstract boolean setSlideBarStatus(Context context, boolean status, String str);

    public abstract void setSystemDormancyState(Context context, boolean enable, String tag);

    public abstract void setStatusBarAndSlideBarState(Context context, boolean isLock, String tag);

        /**
     * Saves current Note.
     */
    public abstract void saveCurrentNote(PluginAppAPI pluginApp, RequestHostCallback callback);

    public abstract void getNotePageData(PluginAppAPI pluginApp, int page, String notePath, RequestHostCallback callback);

        /**
     * Invokes replace Page Trails.
     */
    public abstract void replacePageTrails(PluginAppAPI pluginApp, String notePath, int pageNum, ReadableArray trailArray, RequestHostCallback callback);

        /**
     * Inserts page Trails.
     */
    public abstract void insertPageTrails(PluginAppAPI pluginApp, String notePath, int pageNum, ReadableArray trailArray, RequestHostCallback callback);

        /**
     * Updates page Trails.
     */
    public abstract void modifyPageTrails(PluginAppAPI pluginApp, String notePath, int pageNum, ReadableArray trailArray, RequestHostCallback callback);

    public abstract void getLassoData(PluginAppAPI pluginApp, RequestHostCallback callback);

        /**
     * Gets lasso Trail Type Num.
     */
    public abstract void getLassoTrailTypeNum(PluginAppAPI pluginApp, RequestHostCallback callback);

        /**
     * Deletes lasso Data.
     */
    public abstract void deleteLassoData(PluginAppAPI pluginApp, RequestHostCallback callback);

    public abstract void getPageLayers(PluginAppAPI pluginApp, String notePath, int page, RequestHostCallback callback);

    public abstract void modifyLayers(PluginAppAPI pluginApp, String notePath, int page,
                                      ReadableArray layerArray, RequestHostCallback callback);

    public abstract void insertLayer(PluginAppAPI pluginApp,  String notePath, int page,
                                      ReadableMap layerArray, RequestHostCallback callback);
    public abstract void deleteLayers(PluginAppAPI pluginApp, String notePath, int page,
                                      ReadableArray layerIdArray, RequestHostCallback callback);

        /**
     * Sorts layers.
     */
    public abstract void sortLayers(PluginAppAPI pluginApp, String notePath, int page,
                                    ReadableArray layerIdArray, RequestHostCallback callback);

        /**
     * Gets lasso Link.
     */
    public abstract void getLassoLink(PluginAppAPI pluginApp, RequestHostCallback callback);

        /**
     * Sets lasso Stroke Link.
     */
    public abstract void setLassoStrokeLink(PluginAppAPI pluginApp, ReadableMap paramsMap,
                                            RequestHostCallback callback);


        /**
     * Inserts text Link.
     */
    public abstract void insertTextLink(PluginAppAPI pluginApp, ReadableMap textLinkMap, RequestHostCallback callback);

        /**
     * Updates lasso Link.
     */
    public abstract void modifyLassoLink(PluginAppAPI pluginApp, ReadableMap linkMap, RequestHostCallback callback);


        /**
     * Sets lasso Title.
     */
    public abstract void setLassoTitle(PluginAppAPI pluginApp,ReadableMap titleParams,
                                       RequestHostCallback callback);


        /**
     * Gets titles.
     */
    public abstract void getTitles(PluginAppAPI pluginApp, String notePath, List<Integer> pageList, RequestHostCallback callback);

    public abstract void getLassoTitle(PluginAppAPI pluginApp, RequestHostCallback callback);

    public abstract void modifyLassoTitle(PluginAppAPI pluginApp, ReadableMap titleMap, RequestHostCallback callback);

    public abstract void getKeyWords(PluginAppAPI pluginApp, String notePath, List<Integer> pageList, RequestHostCallback callback);


        /**
     * Inserts key Word.
     */
    public abstract void insertKeyWord(PluginAppAPI pluginApp, String notePath, int page, String keyword, RequestHostCallback callback);

        /**
     * Deletes key Word.
     */
    public abstract void deleteKeyWord(PluginAppAPI pluginApp, String notePath, int page, int index,
                                       RequestHostCallback callback);

        /**
     * Gets lasso Text.
     */
    public abstract void getLassoText(PluginAppAPI pluginApp, RequestHostCallback callback);

    public abstract void insertText(PluginAppAPI pluginApp, ReadableMap textMap, RequestHostCallback callback);

    public abstract void modifyLassoText(PluginAppAPI pluginApp, ReadableMap textMap, RequestHostCallback callback);

    public abstract void getCurrentPageNum(PluginAppAPI pluginApp,RequestHostCallback callback);

    public abstract void getCurrentFilePath(PluginAppAPI pluginApp,RequestHostCallback callback);


    public abstract void reLoadNote(PluginAppAPI pluginApp, RequestHostCallback callback);

        /**
     * Gets note Total Page Num.
     */
    public abstract void getNoteTotalPageNum(PluginAppAPI pluginApp, String notePath, RequestHostCallback callback);


        /**
     * Gets lasso Geometries.
     */
    public abstract void getLassoGeometries(PluginAppAPI pluginApp, RequestHostCallback callback);

    public abstract void insertGeometry(PluginAppAPI pluginApp, ReadableMap geometryMap, RequestHostCallback callback);

    public abstract void modifyLassoGeometry(PluginAppAPI pluginApp, ReadableMap geometryMap, RequestHostCallback callback);


        /**
     * Clears page Layer Data.
     */
    public abstract void clearPageLayerData(PluginAppAPI pluginApp, String notePath, int page, int layer, RequestHostCallback callback);

    public abstract void clearMarkTrails(PluginAppAPI pluginApp, String notePath, int page, RequestHostCallback callback);

        /**
     * Gets note Machine Type.
     */
    public abstract void getNoteMachineType(PluginAppAPI pluginApp, String notePath, RequestHostCallback callback);

        /**
     * Gets page Rotation Type.
     */
    public abstract void getPageRotationType(PluginAppAPI pluginApp, String notePath, int page, RequestHostCallback callback);

        /**
     * Gets page Size.
     */
    public abstract void getPageSize(PluginAppAPI pluginApp, String notePath, int page, RequestHostCallback callback);

        /**
     * Generates note Png.
     */
    public abstract void generateNotePng(PluginAppAPI pluginApp, ReadableMap params, RequestHostCallback callback);


        /**
     * Removes note Page.
     */
    public abstract void removeNotePage(PluginAppAPI pluginApp, String notePath, int page,
                                        RequestHostCallback callback);

        /**
     * Inserts note Page.
     */
    public abstract void insertNotePage(PluginAppAPI pluginApp, ReadableMap paramsMap,
                                        RequestHostCallback callback);

        /**
     * Creates note.
     */
    public abstract void createNote(PluginAppAPI pluginApp, ReadableMap paramsMap, RequestHostCallback callback);

        /**
     * Generates note Style Png.
     */
    public abstract void generateNoteStylePng(PluginAppAPI pluginApp, String notePath, int page, String pngPath, RequestHostCallback callback);

        /**
     * Gets note Style.
     */
    public abstract void getNoteStyle(PluginAppAPI pluginApp, String notePath, int page, RequestHostCallback callback);


        /**
     * Generates mark Thumbnails.
     */
    public abstract void generateMarkThumbnails(PluginAppAPI pluginApp, String markPath, int page, String pngPath,
                                                SizeF size, RequestHostCallback callback);

        /**
     * Searches five Stars.
     */
    public abstract void searchFiveStars(PluginAppAPI pluginApp, String notePath, RequestHostCallback callback);

        /**
     * Gets mark Pages.
     */
    public abstract void getMarkPages(PluginAppAPI pluginApp, String markPage, RequestHostCallback callback);


        /**
     * Gets selected Text.
     */
    public abstract void getSelectedText(PluginAppAPI pluginApp,RequestHostCallback callback);

        /**
     * Gets doc Page Text.
     */
    public abstract void getDocPageText(PluginAppAPI pluginApp, int page, RequestHostCallback callback);

    public abstract void getCurrentDocTotalPages(PluginAppAPI pluginApp, RequestHostCallback callback);



    public abstract void convertTrail2Sticker(PluginAppAPI pluginApp, ReadableMap params,
                                              RequestHostCallback callback);

        /**
     * Gets note Type.
     */
    public abstract void getNoteType(PluginAppAPI pluginApp, String notePath, RequestHostCallback callback);


        /**
     * Gets element Counts.
     */
    public abstract void getElementCounts(PluginAppAPI pluginApp, String notePath, int page,
                                          RequestHostCallback callback);


    /**
     * Get the element sequence number of the specified note and specified page number
     * @param pluginApp
     * @param notePath
     * @param page
     * @param callback
     */
    public abstract void getElementNumList(PluginAppAPI pluginApp, String notePath,int page,
                                           RequestHostCallback callback);

    /**
     * Get a single element by serial number
     * @param pluginApp
     * @param notePath
     * @param page
     * @param num
     * @param callback
     */
    public abstract void getElement(PluginAppAPI pluginApp, String notePath, int page, int num,
                                    RequestHostCallback callback);

    /**
     * Get the last edited element
     * @param pluginApp
     * @param callback
     */
    public abstract void getLastElement(PluginAppAPI pluginApp, RequestHostCallback callback);


        /**
     * Registers pen Up Listener.
     */
    public abstract void registerPenUpListener(PluginAppAPI pluginApp,String event, int type) throws Throwable;

    public abstract void unregisterPenUpListener(PluginAppAPI pluginApp,String event) throws Throwable;

        /**
     * Inserts five Star.
     */
    public abstract void insertFiveStar(PluginAppAPI pluginApp, ReadableArray points, RequestHostCallback callback);

    /**
     * Insert image
     * @param pluginApp
     * @param pngPath
     * @param callback
     */
    public abstract void insertImage(PluginAppAPI pluginApp, String pngPath, RequestHostCallback callback);

}
