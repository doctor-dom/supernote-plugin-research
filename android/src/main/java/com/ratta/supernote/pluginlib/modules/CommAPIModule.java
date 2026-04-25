package com.ratta.supernote.pluginlib.modules;

import android.content.Context;
import android.graphics.Point;
import android.graphics.PointF;
import android.graphics.Rect;
import android.util.Log;
import android.util.SizeF;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.ratta.supernote.pluginlib.NativePluginAPISpec;
import com.ratta.supernote.pluginlib.api.HostCommonAPI;
import com.ratta.supernote.pluginlib.bean.NoteTemplate;
import com.ratta.supernote.pluginlib.callback.RequestHostCallback;
import com.ratta.supernote.pluginlib.constant.paramkey.ResponseKey;
import com.ratta.supernote.pluginlib.core.PluginAppAPI;
import com.ratta.supernote.pluginlib.utils.ConvertUtils;
import com.ratta.supernote.pluginlib.utils.FileUtils;
import com.ratta.supernote.pluginlib.utils.MemoryCalculate;
import com.ratta.supernote.pluginlib.utils.TemplateUtils;
import com.ratta.supernote.plugincommon.data.common.lasso.LassoTrailTypeNum;
import com.ratta.supernote.plugincommon.data.common.trail.Geometry;
import com.ratta.supernote.plugincommon.data.common.trail.KeyWord;
import com.ratta.supernote.plugincommon.data.common.trail.LinkTrail;
import com.ratta.supernote.plugincommon.data.common.trail.RecognData;
import com.ratta.supernote.plugincommon.data.common.trail.Stroke;
import com.ratta.supernote.plugincommon.data.common.trail.TextBox;
import com.ratta.supernote.plugincommon.data.common.trail.TitleTrail;
import com.ratta.supernote.plugincommon.data.common.trail.Trail;
import com.ratta.supernote.plugincommon.data.note.Layer;
import com.ratta.supernote.plugincommon.data.note.NoteStyle;
import com.ratta.supernote.plugincommon.error.PluginAPIError;
import com.ratta.supernote.plugincommon.response.PluginAPIResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


public class CommAPIModule extends NativePluginAPISpec {

    private final String TAG = getName();


    PluginAppAPI mPluginApp;


    /** Angle points */
    private final int TRAIL_POINT_TYPE_ANGLE_POINT = 0,
    /** Contour points */
    TRAIL_POINT_TYPE_CONTOUR_POINT = 1,
    /** Stroke sample points */
    TRAIL_POINT_TYPE_STROKE_SAMPLE_POINT = 2,
    /** Stroke pressure points */
    TRAIL_POINT_TYPE_STROKE_PRESSURE_POINT = 3,
    /** Erase-line data */
    TRAIL_POINT_TYPE_ERASE_LINE_DATA = 4,
    /** Write flag */
    TRAIL_POINT_TYPE_WRITE_FLAG = 5,
    /** Marker pen direction */
    TRAIL_POINT_TYPE_MARK_PEN_DIRECTION = 6,
    /** Recognition data points */
    TRAIL_POINT_TYPE_RECOGNITION_DATA_POINT = 7;

    /** Get list size */
    private final int TRAIL_OP_TYPE_GET_LIST_SIZE = 0,
    /** Add point */
    TRAIL_OP_TYPE_ADD_POINT = 1,
    /** Get point by index */
    TRAIL_OP_TYPE_GET_POINT_BY_INDEX = 2,
    /** Delete point by index */
    TRAIL_OP_TYPE_DELETE_POINT_BY_INDEX = 3,
    /** Insert a point at index */
    TRAIL_OP_TYPE_INSERT_POINT_AT_INDEX = 4,
    // Replace point at index
    TRAIL_OP_TYPE_REPLACE_POINT_AT_INDEX = 5;

//    DataCacheUtils dataCacheUtils;

    private Context mContext;

    private final int STYLE_MAX = 4;


    public CommAPIModule(ReactApplicationContext reactContext, PluginAppAPI pluginApp) {
        super(reactContext);
        mContext = reactContext;
        mPluginApp = pluginApp;
    }


    @Override
    public void createElement(double type, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (!mPluginApp.checkTrailCache()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.TRAIL_CACHE_OUT_MEMORY)));
            return;
        }
        Trail trail = new Trail();
        trail.setUUID(UUID.randomUUID().toString());
        trail.setType((int) type);
        switch (trail.getType()) {
            case Trail.TRAIL_TYPE_STROKE:
                trail.setStroke(new Stroke());
                break;
            case Trail.TRAIL_TYPE_TILE:
                trail.setTitle(new TitleTrail());
                break;
            case Trail.TRAIL_TYPE_PICTURE:
                break;
            case Trail.TRAIL_TYPE_TEXT:

            case Trail.TRAIL_TYPE_TEXT_DIGEST_QUOTE:

            case Trail.TRAIL_TYPE_TEXT_DIGEST_CREATE:
                trail.setTextBox(new TextBox());
                break;
            case Trail.TRAIL_TYPE_LINK:
                trail.setLink(new LinkTrail());
                break;
            case Trail.TRAIL_TYPE_GEO:
                trail.setGeometry(new Geometry());
                break;
        }
        mPluginApp.addTrail(trail);
        PluginAPIResponse response = new PluginAPIResponse();
        response.setSuccess(true);
        WritableMap responseMap = ConvertUtils.response2Map(response);
        responseMap.putMap(ResponseKey.result, ConvertUtils.trail2Map(trail));
        promise.resolve(responseMap);
    }

    @Override
    public void recycleElement(String uuid) {
        if (mPluginApp != null) {
            mPluginApp.removeTrail(uuid);
        }
    }

    @Override
    public void clearElementCache() {
        if(mPluginApp != null) {
            mPluginApp.clearTrailCache();
        }
    }

    /**
     * Operates on point-list data inside a trail.
     * @param {number} page Page number
     * @param {number} type Data type:
     * 0: angle points
     * 1: contour points
     * 2: stroke sample points
     * 3: stroke pressure points
     * 4: erase-line data
     * 5: write flag
     * 6: marker pen direction
     * 7: recognition data points
     * @param {number} opType Operation type:
     * 0: get list size
     * 1: add point
     * 2: get point by index
     * 3: delete point by index
     * 4: insert a point at index
     * @param {number[]} index Point indices: one index targets a point, two indices target a range
     * @param {number[]} subIndex Contour points are nested lists, so a sub-index is required
     * */
    @Override
    public void opElementPointData(String uuid, double type, double opType, ReadableArray index,
                                 ReadableArray subIndex, ReadableArray pointsArray, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(null);
            return;
        }
        Log.i(TAG, "opTrailPointData uuid: " + uuid + " type: " + type + " opType: "
            + opType + " index: " + index + " subIndex: " + subIndex + " pointsArray: " + pointsArray);
        Trail trail = mPluginApp.getTrail(uuid);
        Log.i(TAG, "opTrailPointData trail:");
        if (trail == null) {
            promise.resolve(null);
            return;
        }


        List<Integer> indexList = new ArrayList<>();
        if (index != null) {
            for (int i = 0; i < index.size(); i++) {
                indexList.add(index.getInt(i));
            }
        }

        List<Integer> subIndexList = new ArrayList<>();
        if (subIndex != null) {
            for (int i = 0; i < subIndex.size(); i++) {
                subIndexList.add(subIndex.getInt(i));
            }
        }
        long oldSize = MemoryCalculate.calculateTrailMemorySize(trail);
        switch ((int) type) {
            case TRAIL_POINT_TYPE_ANGLE_POINT:
                List<Point> opPoints = new ArrayList<>();
                if (pointsArray != null) {
                    for (int i = 0; i < pointsArray.size(); i++) {
                        ReadableMap pointMap = pointsArray.getMap(i);
                        if (pointMap != null) {
                            int x = pointMap.hasKey("x") ? pointMap.getInt("x") : 0;
                            int y = pointMap.hasKey("y") ? pointMap.getInt("y") : 0;
                            opPoints.add(new Point(x, y));
                        }
                    }
                }
                List<Point> anglePoints = trail.getAngles();
                opTrail(anglePoints, (int) opType, indexList, opPoints, promise);
                break;
            case TRAIL_POINT_TYPE_CONTOUR_POINT:
                List<List<PointF>> opPointFs = new ArrayList<>();
                for (int i = 0; i < pointsArray.size(); i++) {
                    opPointFs.add(ConvertUtils.map2List(pointsArray.getArray(i), PointF.class));
                }
//                List<PointF> opPointFs = ConvertUtils.map2List(pointsArray, PointF.class);
                List<List<PointF>> contourPointsList = trail.getContoursSrc();
                opTrail(contourPointsList, (int) opType, indexList, subIndexList, opPointFs, promise);
                break;
            case TRAIL_POINT_TYPE_STROKE_SAMPLE_POINT:
                Log.i(TAG, "opTrailPointData TRAIL_POINT_TYPE_STROKE_SAMPLE_POINT");
                List<Point> newPoints = ConvertUtils.map2List(pointsArray, Point.class);
                Stroke stroke = trail.getStroke();
                if (stroke == null) {
                    stroke = new Stroke();
                    trail.setStroke(stroke);
                }
                List<Point> samplePoint = stroke.getPoints();
                opTrail(samplePoint, (int) opType, indexList, newPoints, promise);

                break;
            case TRAIL_POINT_TYPE_STROKE_PRESSURE_POINT:
                stroke = trail.getStroke();
                if (stroke == null) {
                    stroke = new Stroke();
                    trail.setStroke(stroke);
                }
                List<Short> pressures = stroke.getPressures();
                List<Short> shortList = ConvertUtils.map2List(pointsArray, Short.class);
                opTrail(pressures, (int) opType, indexList, shortList, promise);

                break;
            case TRAIL_POINT_TYPE_ERASE_LINE_DATA:
                stroke = trail.getStroke();
                if (stroke == null) {
                    stroke = new Stroke();
                    trail.setStroke(stroke);
                }
                List<Integer> eraseList = stroke.getEraseLineTrailNums();
                List<Integer> integers = ConvertUtils.map2List(pointsArray, Integer.class);
                opTrail(eraseList, (int) opType, indexList, integers, promise);
                break;
            case TRAIL_POINT_TYPE_WRITE_FLAG:
                stroke = trail.getStroke();
                if (stroke == null) {
                    stroke = new Stroke();
                    trail.setStroke(stroke);
                }
                List<Boolean> flags = stroke.getFlagDraw();
                List<Boolean> newFlags = ConvertUtils.map2List(pointsArray, Boolean.class);

                opTrail(flags, (int) opType, indexList, newFlags, promise);
                break;
            case TRAIL_POINT_TYPE_MARK_PEN_DIRECTION:
                stroke = trail.getStroke();
                if (stroke == null) {
                    stroke = new Stroke();
                    trail.setStroke(stroke);
                }
                List<PointF> markPens = stroke.getMarkPenDirection();
                List<PointF> pointFS = ConvertUtils.map2List(pointsArray, PointF.class);
                opTrail(markPens, (int) opType, indexList, pointFS, promise);
                break;
            case TRAIL_POINT_TYPE_RECOGNITION_DATA_POINT:
                stroke = trail.getStroke();
                if (stroke == null) {
                    stroke = new Stroke();
                    trail.setStroke(stroke);
                }
                List<RecognData> recognDataList = stroke.getRecognPoints();
                List<RecognData> newRecognList = ConvertUtils.map2List(pointsArray, RecognData.class);
                opTrail(recognDataList, (int) opType, indexList, newRecognList, promise);
                break;


        }
        long newSize = MemoryCalculate.calculateTrailMemorySize(trail);
        mPluginApp.updateTrailMapMemorySize(oldSize, newSize);


    }

    private void opTrail(List<List<PointF>> points, int opType, List<Integer> index, List<Integer> subIndex,
                         List<List<PointF>> opPoints, Promise promise) {
        int minIndex = -1;
        int maxIndex = -1;
        if (!index.isEmpty()) {
            minIndex = index.get(0);
            maxIndex = minIndex;
            if (index.size() > 1) {
                maxIndex = index.get(1);
            }
        }

        int minSubIndex = -1;
        int maxSubIndex = -1;
        if (!subIndex.isEmpty()) {
            minSubIndex = subIndex.get(0);
            maxSubIndex = minSubIndex;
            if (index.size() > 1) {
                maxSubIndex = subIndex.get(1);
            }
        }

        if (minIndex >= 0 && minIndex < points.size() && minSubIndex >= 0) {
            List<PointF> subPoints = points.get(minIndex);
            opTrail(subPoints, opType, subIndex, opPoints.get(0), promise);
            return;
        }
        opTrail(points, opType, index, opPoints, promise);

    }


    private <T> void opTrail(List<T> points, int opType, List<Integer> index,
                             List<T> opPoints, Promise promise) {
        int minIndex = -1;
        int maxIndex = -1;
        if (!index.isEmpty()) {
            minIndex = index.get(0);
            maxIndex = minIndex;
            if (index.size() > 1) {
                maxIndex = index.get(1);
            }
        }

        switch (opType) {
            case TRAIL_OP_TYPE_GET_LIST_SIZE:
                int size = points.size();
                promise.resolve(size);
                break;
            case TRAIL_OP_TYPE_ADD_POINT:
                points.addAll(opPoints);
                promise.resolve(true);
                break;
            case TRAIL_OP_TYPE_GET_POINT_BY_INDEX:
                if (minIndex < 0) {
                    promise.resolve(null);
                    return;
                }
                if (points.size() <= maxIndex) {
                    promise.resolve(null);
                    return;
                }
                List<T> rePoints = new ArrayList<>();
                if (minIndex == maxIndex) {
                    rePoints.add(points.get(minIndex));

                } else {
                    for (int i = minIndex; i <= maxIndex; i++) {
                        rePoints.add(points.get(i));
                    }
                }
                Log.i(TAG, "opTrail getPoint By index rePoints:" + rePoints);
                WritableArray pointArray = ConvertUtils.list2Map(rePoints);
                promise.resolve(pointArray);


                break;
            case TRAIL_OP_TYPE_DELETE_POINT_BY_INDEX:
                if (minIndex < 0) {
                    promise.resolve(false);
                    return;
                }

                if (minIndex == maxIndex) {
                    if (points.size() <= maxIndex) {
                        promise.resolve(true);
                    } else {
                        points.remove(minIndex);
                    }
                    return;
                }


                for (int count = minIndex; count <= maxIndex; count++) {
                    if (points.size() <= minIndex) {
                        break;
                    }
                    points.remove(minIndex);

                }
                promise.resolve(true);
                break;
            case TRAIL_OP_TYPE_INSERT_POINT_AT_INDEX:
                if (minIndex < 0 || opPoints.isEmpty()) {
                    promise.resolve(false);
                    return;
                }
                if (points.size() < minIndex) {
                    promise.resolve(true);
                } else {
                    points.addAll(minIndex, opPoints);
                }

                break;
            case TRAIL_OP_TYPE_REPLACE_POINT_AT_INDEX:
                Log.i(TAG, "opTrail TRAIL_OP_TYPE_REPLACE_POINT_AT_INDEX");
                if (minIndex < 0 || opPoints.isEmpty()) {
                    promise.resolve(false);
                    return;
                }
                if (points.size() < minIndex) {
                    promise.resolve(false);
                } else {
                    for (int count = minIndex; count <= maxIndex; count++) {
                        if (points.size() <= minIndex) {
                            break;
                        }
                        points.remove(minIndex);

                    }
                    points.addAll(minIndex, opPoints);
                    promise.resolve(true);
                }
                break;
        }
    }

    /**
     * Saves the lasso-selected strokes as a sticker.
     * @param path
     * @param promise
     */
    @Override
    public void saveStickerByLasso(String path, Promise promise) {
        Log.i(TAG, "saveStickerByLasso");
        if (mPluginApp == null) {
            Log.e(TAG, "saveStickerByLasso mPluginApp null");
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            Log.e(TAG, "saveStickerByLasso HostCommonAPI null");
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if(!FileUtils.isValidPath(mContext, mPluginApp, path, ".sticker")) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_PATH_WRONG)));
            return;
        }

        if (!mPluginApp.isLassoTrail()) {
            Log.e(TAG, "saveStickerByLasso  no lasso Trail");
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        HostCommonAPI.getInstance().saveSticker(mPluginApp, path, new RequestHostCallback() {

            @Override
            public void onResponse(PluginAPIResponse response) {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (boolean) response.getResult());
                }
                promise.resolve(responseMap);
            }
        });

    }

    /* @Override
     public void saveSticker(String path, ReadableMap rect, Promise promise) {
         if (mPluginApp == null) {
             promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
             return;
         }
         if (HostCommonAPI.getInstance() == null) {
             promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
             return;
         }

         Rect rectJava = null;
         if (rect != null && rect.hasKey(RectKey.TOP) && rect.hasKey(RectKey.LEFT)
             && rect.hasKey(RectKey.RIGHT) && rect.hasKey(RectKey.BOTTOM)) {
             rectJava = new Rect();
             rectJava.left = rect.getInt(RectKey.LEFT);
             rectJava.top = rect.getInt(RectKey.TOP);
             rectJava.right = rect.getInt(RectKey.RIGHT);
             rectJava.bottom = rect.getInt(RectKey.BOTTOM);
             HostCommonAPI.getInstance().saveSticker(mPluginApp, path, rectJava, new RequestHostCallback() {
                 @Override
                 public void onResponse(PluginAPIResponse response) {
                     WritableMap responseMap = ConvertUtils.response2Map(response);
                     if (response.isSuccess()) {
                         responseMap.putBoolean(ResponseKey.result, (boolean) response.getResult());
                     }
                     promise.resolve(responseMap);
                 }
             });
         } else {

             promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.API_PARAMS_INVALID)));
         }

     }
 */
    @Override
    public void getStickerSize(String path, Promise promise) {
        Log.i(NAME, "getStickerSize path:" + path);
        /*if (!FileUtils.isFileExists(path)) {
            promise.reject(new Throwable("File is not Exists"));
            return;
        }*/

        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if(!FileUtils.isFileExists(path)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }
        if(!FileUtils.isValidPath(mContext, mPluginApp, path, ".sticker")) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_PATH_WRONG)));
            return;
        }


        HostCommonAPI.getInstance().getStickerRect(mPluginApp, path, new RequestHostCallback() {
            @Override
            public void onResponse(PluginAPIResponse response) {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    Rect rect = (Rect) response.getResult();
                    WritableMap stickerSize = Arguments.createMap();
                    stickerSize.putInt("width", rect.width());
                    stickerSize.putInt("height", rect.height());
                    responseMap.putMap(ResponseKey.result, stickerSize);

                }
                promise.resolve(responseMap);
            }

        });

    }

    @Override
    public void generateStickerThumbnail(String stickerPath, String thumbnailPath, ReadableMap size, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().generateStickerThumbnail(mPluginApp, stickerPath, thumbnailPath,
            size,
            new RequestHostCallback() {
                @Override
                public void onResponse(PluginAPIResponse response) {
                    WritableMap responseMap = ConvertUtils.response2Map(response);
                    if (response.isSuccess()) {
                        responseMap.putBoolean(ResponseKey.result, (boolean) response.getResult());
                    }
                    promise.resolve(responseMap);
                }
            });
    }


    @Override
    public void insertSticker(String path, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!FileUtils.isFileExists(path)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        if (!FileUtils.isValidStickerPath(path)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_TYPE_WRONG)));
            return;
        }

        HostCommonAPI.getInstance().insertSticker(mPluginApp, path, new RequestHostCallback() {
            @Override
            public void onResponse(PluginAPIResponse response) {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (boolean) response.getResult());
                }
                promise.resolve(responseMap);
            }
        });
    }

    @Override
    public void convertElement2Sticker(ReadableMap params, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

       /* if (!FileUtils.isValidStickerPath(stickerPath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }*/

        HostCommonAPI.getInstance().convertTrail2Sticker(mPluginApp,  params,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (boolean) response.getResult());
                }
                promise.resolve(responseMap);
            });
    }

    /**
     * Set lasso box state
     * 0: Show, 1: Hide, 2: Completely remove
     * @param {int} state
     */
    @Override
    public void setLassoBoxState(double state, Promise promise) {

        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if(state <0 || state > 2) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.API_PARAMS_INVALID)));
            return;
        }

        HostCommonAPI.getInstance().setLassoBoxState(mPluginApp, (int) state, new RequestHostCallback() {
            @Override
            public void onResponse(PluginAPIResponse response) {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (boolean) response.getResult());
                }
                promise.resolve(responseMap);
            }
        });
    }

    @Override
    public void getLassoRect(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        try {
            HostCommonAPI.getInstance().getLassoRect(mPluginApp, new RequestHostCallback() {
                @Override
                public void onResponse(PluginAPIResponse response) {
                    WritableMap responseMap = ConvertUtils.response2Map(response);
                    if (response.isSuccess()) {
                        responseMap.putMap(ResponseKey.result,
                            ConvertUtils.rect2Map(response.getResult(Rect.class)));
                    }
                    promise.resolve(responseMap);
                }
            });

        } catch (Exception e) {
            promise.reject(e);
        }


    }

    @Override
    public void updateLassoRect(ReadableMap rect, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        try {
            HostCommonAPI.getInstance().updateLassoRect(mPluginApp, rect, new RequestHostCallback() {
                @Override
                public void onResponse(PluginAPIResponse response) {
                    WritableMap responseMap = ConvertUtils.response2Map(response);
                    if (response.isSuccess()) {
                        responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
                    }
                    promise.resolve(responseMap);
                }
            });

        } catch (Exception e) {
            promise.reject(e);
        }

    }

    @Override
    public void setSlideBarStatus(boolean status, Promise promise) {

        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        HostCommonAPI.getInstance().setSlideBarStatus(getReactApplicationContext(), status, mPluginApp.getName());
        promise.resolve(true);

    }

    @Override
    public void setSystemDormancyState(boolean enable) {

        if (mPluginApp == null) {

            return;
        }
        if (HostCommonAPI.getInstance() == null) {

            return;
        }
        HostCommonAPI.getInstance().setSystemDormancyState(getReactApplicationContext(), enable, mPluginApp.getName());

    }

    @Override
    public void setStatusBarAndSlideBarState(boolean isLock) {
        Log.i(NAME, "plugin setStatusBarAndSlideBarState isLock:" + isLock);

        if (mPluginApp == null) {

            return;
        }
        if (HostCommonAPI.getInstance() == null) {

            return;
        }
        HostCommonAPI.getInstance().setStatusBarAndSlideBarState(getReactApplicationContext(), isLock, mPluginApp.getName());
    }

    @Override
    public void saveCurrentNote(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().saveCurrentNote(mPluginApp, new RequestHostCallback() {
            @Override
            public void onResponse(PluginAPIResponse response) {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
                }
                promise.resolve(responseMap);
            }
        });
    }

    /**
     * Gets stroke data. TODO: optimize later because some types need conversion.
     * @param page
     * @param notePath
     * @param promise
     */
    @Override
    public void getElements(double page, String notePath, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }
        if(!mPluginApp.checkTrailCache()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.TRAIL_CACHE_OUT_MEMORY)));
            return;
        }
        HostCommonAPI.getInstance().getNotePageData(mPluginApp, (int) page, notePath, new RequestHostCallback() {

            @Override
            public void onResponse(PluginAPIResponse response) {

                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    String result = response.getResult(String.class);
                    WritableArray trailDataList = mPluginApp.readTrailsFromFile( result);
                    responseMap.putArray(ResponseKey.result, trailDataList);
                }
                promise.resolve(responseMap);

            }


        });
    }


    @Override
    public void replaceElements(String notePath, double page, ReadableArray trailArray, Promise promise) {

        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }


        HostCommonAPI.getInstance().replacePageTrails(mPluginApp, notePath, (int) page, trailArray, new RequestHostCallback() {

            @Override
            public void onResponse(PluginAPIResponse response) {

                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
                promise.resolve(responseMap);

            }


        });
    }

    @Override
    public void insertElements(String notePath, double page, ReadableArray trailArray, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }


        HostCommonAPI.getInstance().insertPageTrails(mPluginApp, notePath, (int) page, trailArray, new RequestHostCallback() {

            @Override
            public void onResponse(PluginAPIResponse response) {

                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
                promise.resolve(responseMap);

            }


        });
    }

    @Override
    public void modifyElements(String notePath, double page, ReadableArray trailArray, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }


        HostCommonAPI.getInstance().modifyPageTrails(mPluginApp, notePath, (int) page, trailArray, new RequestHostCallback() {

            @Override
            public void onResponse(PluginAPIResponse response) {

                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    List<Integer> modifyTrailNums = (List<Integer>) response.getResult();
                    WritableArray numArr = Arguments.createArray();
                    for (Integer num: modifyTrailNums) {
                        numArr.pushInt(num);
                    }
                    responseMap.putArray(ResponseKey.result, numArr);
                }
                promise.resolve(responseMap);

            }


        });
    }

    // TODO The APIs below still need verification
    @Override
    public void getLassoElements(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));

            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        HostCommonAPI.getInstance().getLassoData(mPluginApp, new RequestHostCallback() {
            @Override
            public void onResponse(PluginAPIResponse response) {

                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    String result = response.getResult(String.class);
                    WritableArray trailDataList = mPluginApp.readTrailsFromFile(result);
                    responseMap.putArray(ResponseKey.result, trailDataList);
                }
                promise.resolve(responseMap);

            }
        });
    }

    @Override
    public void getLassoElementTypeCounts(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));

            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        HostCommonAPI.getInstance().getLassoTrailTypeNum(mPluginApp, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                WritableMap resultMap = ConvertUtils.lassoTrailTypeNum2Map(response.getResult(LassoTrailTypeNum.class));
                responseMap.putMap(ResponseKey.result, resultMap);
            }
            promise.resolve(responseMap);
        });
    }


    @Override
    public void deleteLassoElements(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));

            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        HostCommonAPI.getInstance().deleteLassoData(mPluginApp, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });

    }

    @Override
    public void getLayers(String notePath, double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().getPageLayers(mPluginApp, notePath, (int) page, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                List<Layer> layers = (List<Layer>) response.getResult();
                WritableArray layersArray = Arguments.createArray();
                for (Layer layer : layers) {
                    WritableMap layerMap = ConvertUtils.layer2Map(layer);
                    layersArray.pushMap(layerMap);
                }
                responseMap.putArray(ResponseKey.result, layersArray);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void modifyLayers(String notePath, double page, ReadableArray layers, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().modifyLayers(mPluginApp, notePath, (int) page, layers, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                List<Integer> ids = (List<Integer>) response.getResult();
                WritableArray idArr = Arguments.createArray();
                for (int id: ids) {
                    idArr.pushInt(id);
                }
                responseMap.putArray(ResponseKey.result, idArr);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void insertLayer(String notePath, double page, ReadableMap layer, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().insertLayer(mPluginApp, notePath, (int) page, layer, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void deleteLayers(String notePath, double page, ReadableArray layerIds, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().deleteLayers(mPluginApp, notePath, (int) page, layerIds, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void sortLayers(String notePath, double page, ReadableArray layerIds, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().sortLayers(mPluginApp, notePath, (int) page, layerIds, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getLassoLink(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        HostCommonAPI.getInstance().getLassoLink(mPluginApp, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                WritableArray array = Arguments.createArray();
                List<LinkTrail> linkTrails = (List<LinkTrail>) response.getResult();
                for (LinkTrail linkTrail: linkTrails) {
                    array.pushMap(ConvertUtils.lassoLink2Map(linkTrail));
                }
                responseMap.putArray(ResponseKey.result, array);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void setLassoStrokeLink(ReadableMap paramsMap, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }
       /* if (linkType == 1 || linkType == 2 || linkType == 3) {
            if (!FileUtils.isFileExists(destPath)) {
                promise.resolve(ConvertUtils.response2Map(
                    new PluginAPIResponse(PluginAPIError.LINK_NO_DEST_FILE)));
                return;
            }
        }*/

        HostCommonAPI.getInstance().setLassoStrokeLink(mPluginApp, paramsMap, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putInt(ResponseKey.result, (Integer) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void insertTextLink(ReadableMap textLink, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }


        HostCommonAPI.getInstance().insertTextLink(mPluginApp, textLink, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putInt(ResponseKey.result, (Integer) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void modifyLassoLink(ReadableMap linkMap, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        HostCommonAPI.getInstance().modifyLassoLink(mPluginApp, linkMap,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void setLassoTitle( ReadableMap titleParams, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }


        HostCommonAPI.getInstance().setLassoTitle(mPluginApp,  titleParams, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getTitles(String notePath, ReadableArray pageList, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        List<Integer> pages = new ArrayList<>();
        for (int i = 0; i < pageList.size(); i++) {
            pages.add(pageList.getInt(i));
        }

        HostCommonAPI.getInstance().getTitles(mPluginApp, notePath, pages, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                List<TitleTrail> titles = (List<TitleTrail>) response.getResult();
                WritableArray titlesArray = Arguments.createArray();
                for (TitleTrail title : titles) {
                    WritableMap titleMap = ConvertUtils.title2Map(title);
                    titlesArray.pushMap(titleMap);
                }
                responseMap.putArray(ResponseKey.result, titlesArray);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getLassoTitle(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }


        HostCommonAPI.getInstance().getLassoTitle(mPluginApp, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() ) {
                if(response.getResult() != null) {
                    List<TitleTrail> titleTrails = (List<TitleTrail>) response.getResult();
                    WritableArray array = Arguments.createArray();
                    for (TitleTrail titleTrail: titleTrails) {
                        array.pushMap(ConvertUtils.title2Map(titleTrail));
                    }


                    responseMap.putArray(ResponseKey.result, array);
                } else {
                    responseMap.putArray(ResponseKey.result, null);
                }
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void modifyLassoTitle(ReadableMap titleParams, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        /*if (style < 0 || style > STYLE_MAX) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.API_PARAMS_INVALID)));
            return;
        }*/

        HostCommonAPI.getInstance().modifyLassoTitle(mPluginApp, titleParams,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getKeyWords(String notePath, ReadableArray pageList, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        List<Integer> pages = new ArrayList<>();
        for (int i = 0; i < pageList.size(); i++) {
            pages.add(pageList.getInt(i));
        }

        HostCommonAPI.getInstance().getKeyWords(mPluginApp, notePath, pages, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                List<KeyWord> keyWords = (List<KeyWord>) response.getResult();
                WritableArray keyWordsArray = Arguments.createArray();
                for (KeyWord keyWord : keyWords) {
                    WritableMap keyWordMap = ConvertUtils.keyWord2Map(keyWord);
                    keyWordsArray.pushMap(keyWordMap);
                }
                responseMap.putArray(ResponseKey.result, keyWordsArray);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void insertKeyWord(String notePath, double page, String keyword, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().insertKeyWord(mPluginApp, notePath, (int) page, keyword, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void deleteKeyWord(String notePath, double page, double index, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().deleteKeyWord(mPluginApp, notePath, (int) page, (int) index, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getLassoText(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        HostCommonAPI.getInstance().getLassoText(mPluginApp, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess() && response.getResult() != null) {
                List<TextBox> textBoxes = (List<TextBox>) response.getResult();
                WritableArray textBoxesArray = Arguments.createArray();
                for (TextBox textBox : textBoxes) {
                    WritableMap textBoxMap = ConvertUtils.text2Map(textBox);
                    if (textBoxMap == null) {
                        continue;
                    }
                    textBoxesArray.pushMap(textBoxMap);
                }
                responseMap.putArray(ResponseKey.result, textBoxesArray);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void insertText(ReadableMap textMap, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (textMap == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.API_PARAMS_INVALID)));
            return;
        }

        HostCommonAPI.getInstance().insertText(mPluginApp, textMap, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void modifyLassoText(ReadableMap textMap, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }

        if (textMap == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.API_PARAMS_INVALID)));
            return;
        }

        HostCommonAPI.getInstance().modifyLassoText(mPluginApp, textMap, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getCurrentPageNum(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().getCurrentPageNum(mPluginApp,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putInt(ResponseKey.result, (Integer) response.getResult());
                }

                promise.resolve(responseMap);
            });

    }

    @Override
    public void getCurrentFilePath(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().getCurrentFilePath(mPluginApp,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putString(ResponseKey.result, (String) response.getResult());
                }

                promise.resolve(responseMap);
            }
        );

    }

    @Override
    public void reloadFile(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }


        HostCommonAPI.getInstance().reLoadNote(mPluginApp, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getNoteTotalPageNum(String notePath, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }


        HostCommonAPI.getInstance().getNoteTotalPageNum(mPluginApp, notePath, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putInt(ResponseKey.result, (Integer) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getLassoGeometries(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }


        HostCommonAPI.getInstance().getLassoGeometries(mPluginApp, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                WritableArray array = Arguments.createArray();
                List<Geometry> geometries = (List<Geometry>) response.getResult();
                for (Geometry geometry : geometries) {
                    WritableMap geometryMap = ConvertUtils.geometry2Map(geometry);
                    if (geometryMap == null) {
                        continue;
                    }
                    array.pushMap(geometryMap);
                }
                responseMap.putArray(ResponseKey.result, array);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void insertGeometry(ReadableMap geometry, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if (geometry == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.API_PARAMS_INVALID)));
            return;
        }

        HostCommonAPI.getInstance().insertGeometry(mPluginApp, geometry, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void modifyLassoGeometry(ReadableMap geometry, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        /*if (!mPluginApp.isLassoTrail()) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.LASSO_ERROR_NO_LASSO)));
            return;
        }*/

        if (geometry == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.API_PARAMS_INVALID)));
            return;
        }

        HostCommonAPI.getInstance().modifyLassoGeometry(mPluginApp, geometry, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
            }
            promise.resolve(responseMap);
        });
    }


    @Override
    public void clearLayerElements(String notePath, double page, double layer, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        if(!FileUtils.isNote(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_NOTE)));
            return;
        }


        HostCommonAPI.getInstance().clearPageLayerData(mPluginApp, notePath, (int) page, (int) layer, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void clearMarkElements(String filePath, double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if(!FileUtils.isFileExists(filePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }


        HostCommonAPI.getInstance().clearMarkTrails(mPluginApp, filePath, (int) page, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
            }
            promise.resolve(responseMap);
        });
    }

    /*@Override
    public void getPageRotationType(String notePath, double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;

        }


        HostCommonAPI.getInstance().getPageRotationType(mPluginApp, notePath, (int) page, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putInt(ResponseKey.result, response.getResult(Integer.class));
            }
            promise.resolve(responseMap);
        });
    }*/

    @Override
    public void getPageSize(String notePath, double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;

        }


        HostCommonAPI.getInstance().getPageSize(mPluginApp, notePath, (int) page, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                SizeF size = response.getResult(SizeF.class);
                WritableMap sizeMap = Arguments.createMap();
                sizeMap.putInt("width", (int) size.getWidth());
                sizeMap.putInt("height", (int) size.getHeight());
                responseMap.putMap(ResponseKey.result, sizeMap);
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void getFileMachineType(String notePath, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;

        }


        HostCommonAPI.getInstance().getNoteMachineType(mPluginApp, notePath, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putInt(ResponseKey.result, response.getResult(Integer.class));
            }
            promise.resolve(responseMap);
        });
    }

    @Override
    public void generateNotePng(ReadableMap params, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

       /* if (!FileUtils.isValidPath(mContext, mPluginApp, pngPath, ".png")) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_PATH_WRONG)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;

        }*/


        HostCommonAPI.getInstance().generateNotePng(mPluginApp, params, response -> {
            WritableMap responseMap = ConvertUtils.response2Map(response);
            if (response.isSuccess()) {
                responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
            }
            promise.resolve(responseMap);
        });
    }


    private List<NoteTemplate> templateListCache = null;

    @Override
    public void getNoteSystemTemplates(Promise promise) {
        if (templateListCache == null) {
            templateListCache = TemplateUtils.getTemplateList();
            Log.i(TAG, "getNoteTemplates templates:" + templateListCache.size());
        }
        WritableArray resultArray = Arguments.createArray();
        for (NoteTemplate template : templateListCache) {
            WritableMap templateMap = Arguments.createMap();
            templateMap.putString("name", template.getName());
            String vUri = "android.resource://" + mContext.getPackageName() + "/drawable/" + template.getVUri();
            templateMap.putString("vUri", vUri);
            String hUri = "android.resource://" + mContext.getPackageName() + "/drawable/" + template.getHUri();
            templateMap.putString("hUri", hUri);
            resultArray.pushMap(templateMap);
        }
        promise.resolve(resultArray);


    }

    public void getLocalResourcePath(String resourceName, Promise promise) {
        try {
            // Build the full path for the resource
            String resourcePath = "";

            // Validate whether the resource exists
            int resourceId = mContext.getResources().getIdentifier(getResourceNameWithoutExtension(resourceName), "drawable", mContext.getPackageName());


            if (resourceId != 0) {
                resourcePath = "android.resource://" + mContext.getPackageName() + "/drawable/" + getResourceNameWithoutExtension(resourceName);

            }
            promise.resolve(resourcePath);
        } catch (Exception e) {
            promise.reject(e.toString());

        }
    }

    /**
     * Removes the extension from a resource file name.
     * @param resourceName Resource name (e.g. "style_5mm_dots.png")
     * @return Resource name without extension (e.g. "style_5mm_dots")
     */
    private String getResourceNameWithoutExtension(String resourceName) {
        if (resourceName != null && resourceName.contains(".")) {
            return resourceName.substring(0, resourceName.lastIndexOf("."));
        }
        return resourceName;
    }

    @Override
    public void removeNotePage(String notePath, double page, Promise promise) {

        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().removeNotePage(mPluginApp, notePath, (int) page,
            (RequestHostCallback) response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
                }
                promise.resolve(responseMap);
            });

    }

    @Override
    public void insertNotePage(ReadableMap params, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().insertNotePage(mPluginApp,
            params,
            (RequestHostCallback) response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
                }
                promise.resolve(responseMap);
            });


    }

    @Override
    public void createNote(ReadableMap params, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }



        HostCommonAPI.getInstance().createNote(mPluginApp, params,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void generateNoteTemplatePng(String notePath, double page, String pngPath, Promise promise) {

        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }
        if (!FileUtils.isValidPath(mContext, mPluginApp, pngPath,".png")) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_PATH_WRONG)));
            return;
        }
        HostCommonAPI.getInstance().generateNoteStylePng(mPluginApp, notePath, (int) page, pngPath,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getNotePageTemplate(String notePath, double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().getNoteStyle(mPluginApp, notePath, (int) page,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    NoteStyle noteStyle = response.getResult(NoteStyle.class);

                    responseMap.putMap(ResponseKey.result, ConvertUtils.noteStyle2Map(noteStyle));
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void generateMarkThumbnails(String notePath, double page, String pngPath, ReadableMap size, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        if (!FileUtils.isValidPath(mContext, mPluginApp, pngPath,".png")) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_PATH_WRONG)));
            return;
        }

        HostCommonAPI.getInstance().generateMarkThumbnails(mPluginApp, notePath, (int) page, pngPath, ConvertUtils.map2Size(size),
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {

                    responseMap.putBoolean(ResponseKey.result, response.getResult(Boolean.class));
                }
                promise.resolve(responseMap);
            });

    }

    @Override
    public void searchFiveStars(String filePath, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(filePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().searchFiveStars(mPluginApp, filePath,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    List<Integer> pages = (List<Integer>) response.getResult();
                    WritableArray pageArr = Arguments.createArray();
                    for (int page : pages) {
                        pageArr.pushInt(page);
                    }

                    responseMap.putArray(ResponseKey.result, pageArr);
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getMarkPages(String filePath, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(filePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().getMarkPages(mPluginApp, filePath,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    List<Integer> pages = (List<Integer>) response.getResult();
                    WritableArray pageArr = Arguments.createArray();
                    for (int page : pages) {
                        pageArr.pushInt(page);
                    }

                    responseMap.putArray(ResponseKey.result, pageArr);
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getSelectedText(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().getSelectedText(mPluginApp,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {


                    responseMap.putString(ResponseKey.result, response.getResult(String.class));
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getCurrentDocText(double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().getDocPageText(mPluginApp, (int) page,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    responseMap.putString(ResponseKey.result, response.getResult(String.class));
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getCurrentDocTotalPages(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        HostCommonAPI.getInstance().getCurrentDocTotalPages(mPluginApp,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    responseMap.putInt(ResponseKey.result, response.getResult(Integer.class));
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getNoteType(String notePath, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if(!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }


        HostCommonAPI.getInstance().getNoteType(mPluginApp,notePath,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    responseMap.putInt(ResponseKey.result, response.getResult(Integer.class));
                }
                promise.resolve(responseMap);
            });
    }


    @Override
    public void getElementCounts(String notePath, double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().getElementCounts(mPluginApp, notePath, (int) page,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    responseMap.putInt(ResponseKey.result, response.getResult(Integer.class));
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getElementNumList(String notePath, double page, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().getElementNumList(mPluginApp, notePath, (int) page,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);

                if (response.isSuccess()) {
                    WritableArray array = Arguments.createArray();
                    List<Integer> numList = (List<Integer>) response.getResult();
                    for (Integer num : numList) {
                        array.pushInt(num);
                    }
                    responseMap.putArray(ResponseKey.result, array);
                }
                promise.resolve(responseMap);
            });
    }

    @Override
    public void getElement(String notePath, double page, double num, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }

        if (!FileUtils.isFileExists(notePath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().getElement(mPluginApp, notePath, (int) page, (int) num,
            new RequestHostCallback() {

                @Override
                public void onResponse(PluginAPIResponse response) {

                    WritableMap responseMap = ConvertUtils.response2Map(response);
                    if (response.isSuccess()) {
                        String result = response.getResult(String.class);
                        WritableArray trailDataList = mPluginApp.readTrailsFromFile(result);
                        if (trailDataList == null || trailDataList.size() <= 0) {
                            responseMap.putMap(ResponseKey.result, null);
                        } else {
                            responseMap.putMap(ResponseKey.result, trailDataList.getMap(0));
                        }
                    }
                    promise.resolve(responseMap);

                }


            });
    }

    @Override
    public void getLastElement(Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        HostCommonAPI.getInstance().getLastElement(mPluginApp,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    String result = response.getResult(String.class);
                    WritableArray trailDataList = mPluginApp.readTrailsFromFile(result);
                    if (trailDataList == null || trailDataList.size() <= 0) {
                        responseMap.putMap(ResponseKey.result, null);
                    } else {
                        responseMap.putMap(ResponseKey.result, trailDataList.getMap(0));
                    }
                }
                promise.resolve(responseMap);

            });
    }

    @Override
    public void registerEventListener(String event, double registerType) {
        try {
            HostCommonAPI.getInstance().registerPenUpListener(mPluginApp, event, (int) registerType);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void unregisterEventListener(String event) {
        try {
            HostCommonAPI.getInstance().unregisterPenUpListener(mPluginApp, event);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }

    }

    @Override
    public void insertFiveStar(@Nullable ReadableArray starPoints, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (HostCommonAPI.getInstance() == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.HOST_API_NO_INIT)));
            return;
        }
        HostCommonAPI.getInstance().insertFiveStar(mPluginApp,starPoints,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
                promise.resolve(responseMap);

            });
    }

    @Override
    public void insertImage(String pngPath, Promise promise) {
        if (mPluginApp == null) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.PLUGIN_APP_NULL)));
            return;
        }
        if (!FileUtils.isFileExists(pngPath)) {
            promise.resolve(ConvertUtils.response2Map(new PluginAPIResponse(PluginAPIError.FILE_NOT_EXISTS)));
            return;
        }

        HostCommonAPI.getInstance().insertImage(mPluginApp, pngPath,
            response -> {
                WritableMap responseMap = ConvertUtils.response2Map(response);
                if (response.isSuccess()) {
                    responseMap.putBoolean(ResponseKey.result, (Boolean) response.getResult());
                }
                promise.resolve(responseMap);

            });

    }
}
