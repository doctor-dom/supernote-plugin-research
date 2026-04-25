package com.ratta.supernote.pluginlib.utils;

import static com.ratta.supernote.pluginlib.constant.Constant.GEO_TYPES;
import static com.ratta.supernote.pluginlib.constant.Constant.LINK_CATEGORIES;
import static com.ratta.supernote.pluginlib.constant.Constant.LINK_FILE_TYPES;
import static com.ratta.supernote.pluginlib.constant.Constant.LINK_STYLES;
import static com.ratta.supernote.pluginlib.constant.Constant.LINK_TYPES;
import static com.ratta.supernote.pluginlib.constant.Constant.MAIN_LAYER_TRAIL_TYPES;
import static com.ratta.supernote.pluginlib.constant.Constant.PEN_COLORS;
import static com.ratta.supernote.pluginlib.constant.Constant.PEN_TYPES;
import static com.ratta.supernote.pluginlib.constant.Constant.TITLE_STYLES;
import static com.ratta.supernote.pluginlib.constant.Constant.TRAIL_TYPES;
import static com.ratta.supernote.pluginlib.constant.Constant.dexDependencies;

import android.graphics.Point;
import android.graphics.PointF;
import android.graphics.Rect;
import android.text.TextUtils;
import android.util.Log;
import android.util.SizeF;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.ratta.supernote.plugincommon.data.common.trail.Picture;
import com.ratta.supernote.pluginlib.constant.paramkey.LayerKey;
import com.ratta.supernote.pluginlib.constant.paramkey.ResponseKey;
import com.ratta.supernote.pluginlib.constant.paramkey.TextKey;
import com.ratta.supernote.pluginlib.constant.paramkey.TrailKey;
import com.ratta.supernote.plugincommon.data.common.lasso.LassoTrailTypeNum;
import com.ratta.supernote.plugincommon.data.common.lasso.ModifyLassoLink;
import com.ratta.supernote.plugincommon.data.common.lasso.TextLink;
import com.ratta.supernote.plugincommon.data.common.trail.FiveStar;
import com.ratta.supernote.plugincommon.data.common.trail.Geometry;
import com.ratta.supernote.plugincommon.data.common.trail.KeyWord;
import com.ratta.supernote.plugincommon.data.common.trail.LinkTrail;
import com.ratta.supernote.plugincommon.data.common.trail.RecogResultData;
import com.ratta.supernote.plugincommon.data.common.trail.RecognData;
import com.ratta.supernote.plugincommon.data.common.trail.Stroke;
import com.ratta.supernote.plugincommon.data.common.trail.TextBox;
import com.ratta.supernote.plugincommon.data.common.trail.TitleTrail;
import com.ratta.supernote.plugincommon.data.common.trail.Trail;
import com.ratta.supernote.plugincommon.data.note.Layer;
import com.ratta.supernote.plugincommon.data.note.NoteStyle;
import com.ratta.supernote.plugincommon.error.PluginAPIError;
import com.ratta.supernote.plugincommon.error.PluginException;
import com.ratta.supernote.plugincommon.response.PluginAPIResponse;
import com.ratta.supernote.plugincommon.response.PluginAPIResponseError;

import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Data conversion utilities.
 */
public class ConvertUtils {

    private static final String TAG = "ConvertUtils";

    public static List<Point> arrayMap2Points(ReadableArray pointsArray) {
        List<Point> pointsList = new ArrayList<>();
        if (pointsArray != null) {

            for (int i = 0; i < pointsArray.size(); i++) {
                ReadableMap pointMap = pointsArray.getMap(i);
                if (pointMap != null) {
                    int x = (pointMap.hasKey("x") && !pointMap.isNull("x")) ? pointMap.getInt("x") : 0;
                    int y = (pointMap.hasKey("y") && !pointMap.isNull("y")) ? pointMap.getInt("y") : 0;
                    pointsList.add(new Point(x, y));
                }
            }

        }
        return pointsList;

    }

    private static ReadableArray points2ArrayMap(List<Point> points) {
        WritableArray pointsArray = Arguments.createArray();
        for (Point point : points) {
            WritableMap pointMap = Arguments.createMap();
            pointMap.putInt("x", point.x);
            pointMap.putInt("y", point.y);
            pointsArray.pushMap(pointMap);
        }
        return pointsArray;
    }

    public static WritableMap response2Map(PluginAPIResponse response) {
        WritableMap responseMap = Arguments.createMap();
        responseMap.putBoolean(ResponseKey.success, response.isSuccess());
        if (!response.isSuccess() && response.getError() != null && response.getError().getCode() > 0) {
            PluginAPIResponseError error = response.getError();
            WritableMap errorMap = Arguments.createMap();
            errorMap.putInt(ResponseKey.code, error.getCode());
            errorMap.putString(ResponseKey.message, error.getMessage());
            responseMap.putMap(ResponseKey.error, errorMap);
        }
        return responseMap;
    }

    // Internal helper methods
    public static WritableMap trail2Map(Trail trail) {
        WritableMap trailData = Arguments.createMap();

        // Base fields
        trailData.putString(TrailKey.UUID, trail.getUUID());
        trailData.putInt(TrailKey.TYPE, trail.getType());
        // trailData.putInt(TrailKey.FLAG_PEN_UP, trail.getFlagPenUp());
        // trailData.putInt(TrailKey.FLAG_SPECIAL, trail.getFlagSpecial());
        // trailData.putInt(TrailKey.PRE_NUM, trail.getPreNum());
        trailData.putInt(TrailKey.PAGE_NUM, trail.getPageNum());
        trailData.putInt(TrailKey.LAYER_NUM, trail.getLayerNum());
        // trailData.putInt(TrailKey.TRAIL_NUM, trail.getTrailNum());
        trailData.putInt(TrailKey.TRAIL_NUM_IN_PAGE, trail.getTrailNumInPage());
        trailData.putInt(TrailKey.MAX_X, trail.getMaxX());
        trailData.putInt(TrailKey.MAX_Y, trail.getMaxY());

        // trailData.putString(TrailKey.UUID, trail.getUUID());
        trailData.putInt(TrailKey.THICKNESS, trail.getThickness());
        RecogResultData recogResultData = trail.getRecognizeResult();
        if (recogResultData != null) {
            trailData.putMap(TrailKey.RECOGNIZE_RESULT, recogResultData2Map(recogResultData));
        }
        trailData.putInt(TrailKey.TRAIL_STATUS, trail.getTrailStatus());
        List<List<PointF>> contoursSrc = trail.getContoursSrc();
        /*
         * if (contoursSrc != null && !contoursSrc.isEmpty()) {
         * WritableArray contourArray = Arguments.createArray();
         * for (List<PointF> pointFS : contoursSrc) {
         * WritableArray pointArray = Arguments.createArray();
         * for (PointF pointF : pointFS) {
         * WritableMap pointMap = Arguments.createMap();
         * pointMap.putDouble("x", pointF.x);
         * pointMap.putDouble("y", pointF.y);
         * pointArray.pushMap(pointMap);
         * }
         * contourArray.pushArray(pointArray);
         * }
         * trailData.putArray(TrailKey.CONTOURS_SRC, contourArray);
         * }
         */
        trailData.putInt(TrailKey.CONTOURS_SRC, contoursSrc.size());

        // Angle data - convert to WritableArray
        /*
         * if (trail.getAngles() != null && !trail.getAngles().isEmpty()) {
         * WritableArray anglesArray = Arguments.createArray();
         * for (Point point : trail.getAngles()) {
         * WritableMap pointMap = Arguments.createMap();
         * pointMap.putInt("x", point.x);
         * pointMap.putInt("y", point.y);
         * anglesArray.pushMap(pointMap);
         * }
         * trailData.putArray(TrailKey.ANGLES, anglesArray);
         * }
         */
        trailData.putInt(TrailKey.ANGLES, trail.getAngles().size());

        /*
         * trailData.putDouble(TrailKey.FACTOR_RESIZE, trail.getFactorResize());
         * trailData.putBoolean(TrailKey.FILTER_FLAG, trail.isFilterFlag());
         */

        /*
         * trailData.putInt(TrailKey.REDRAW_HEIGHT, trail.getRedrawHeight());
         * trailData.putInt(TrailKey.REDRAW_WIDTH, trail.getRedrawWidth());
         */
        // trailData.putInt(TrailKey.DRAW_VERSION, trail.getDrawVersion());
        // trailData.putInt(TrailKey.EMR_POINT_AXIS, trail.getEmrPointAxis());

        // Object fields - add corresponding WritableMap when non-null
        if (trail.getStroke() != null) {
            trailData.putMap(TrailKey.STROKE, stroke2Map(trail.getStroke()));
        }

        if (trail.getLink() != null) {
            trailData.putMap(TrailKey.LINK, linkData2Map(trail.getLink()));
        }

        if (trail.getTitle() != null) {
            trailData.putMap(TrailKey.TITLE, title2Map(trail.getTitle()));
        }

        if (trail.getTextBox() != null) {
            trailData.putMap(TrailKey.TEXT_BOX, text2Map(trail.getTextBox()));
        }
        if (trail.getGeometry() != null) {
            trailData.putMap(TrailKey.GEOMETRY, geometry2Map(trail.getGeometry()));
        }
        if (trail.getFiveStar() != null) {
            trailData.putMap(TrailKey.FIVE_STAR, fiveStar2Map(trail.getFiveStar()));
        }
        if(trail.getPicture() !=null) {
            trailData.putMap(TrailKey.PICTURE, picture2Map(trail.getPicture()));
        }

        return trailData;
    }

    public static WritableMap picture2Map(Picture picture) {

        if(picture == null) {
            return null;
        }
        WritableMap pictureMap = Arguments.createMap();
        pictureMap.putString(TrailKey.PICTURE_PATH, picture.getPicturePath());
        pictureMap.putMap(TrailKey.PICTURE_RECT, rect2Map(picture.getRect()));
        return pictureMap;
    }

    public static Picture map2Picture(ReadableMap map) throws PluginException {

        if(map == null) {
            return null;
        }
        if(!map.hasKey(TrailKey.PICTURE_PATH) || map.isNull(TrailKey.PICTURE_PATH)) {
            throw new PluginException(PluginAPIError.PNG_FILE_NO_EXISTS);
        }
        String picturePath = map.getString(TrailKey.PICTURE_PATH);
        if(!FileUtils.isFileExists(picturePath)) {
            throw new PluginException(PluginAPIError.PNG_FILE_NO_EXISTS);
        }

        Rect rect = map2Rect(map.getMap(TrailKey.PICTURE_RECT));
        return new Picture(rect, picturePath);
    }



    public static WritableMap fiveStar2Map(FiveStar fiveStar) {
        if (fiveStar == null) {
            return null;
        }
        WritableMap fiveStarMap = Arguments.createMap();

        if (fiveStar.getPoints() != null && !fiveStar.getPoints().isEmpty()) {
            WritableArray pointsArray = Arguments.createArray();
            for (Point point : fiveStar.getPoints()) {
                WritableMap pointMap = Arguments.createMap();
                pointMap.putInt("x", point.x);
                pointMap.putInt("y", point.y);
                pointsArray.pushMap(pointMap);
            }
            fiveStarMap.putArray("points", pointsArray);
        }

        return fiveStarMap;
    }

    public static WritableMap geometry2Map(Geometry geometry) {
        if (geometry == null) {
            return null;
        }

        WritableMap geometryMap = Arguments.createMap();

        // Base field conversion
        geometryMap.putInt("penType", geometry.getPenType());
        geometryMap.putInt("penColor", geometry.getPenColor());
        geometryMap.putInt("penWidth", geometry.getPenWidth());

        if (geometry.getType() != null) {
            geometryMap.putString("type", geometry.getType());
        }

        // Convert points list
        if (geometry.getPoints() != null && !geometry.getPoints().isEmpty()) {
            WritableArray pointsArray = Arguments.createArray();
            for (Point point : geometry.getPoints()) {
                WritableMap pointMap = Arguments.createMap();
                pointMap.putInt("x", point.x);
                pointMap.putInt("y", point.y);
                pointsArray.pushMap(pointMap);
            }
            geometryMap.putArray("points", pointsArray);
        }

        // Convert ellipse center point
        Point ellipseCenterPoint = geometry.getEllipseCenterPoint();
        if (ellipseCenterPoint != null) {
            WritableMap centerPointMap = Arguments.createMap();
            centerPointMap.putInt("x", ellipseCenterPoint.x);
            centerPointMap.putInt("y", ellipseCenterPoint.y);
            geometryMap.putMap("ellipseCenterPoint", centerPointMap);
        }

        // Ellipse-related fields
        geometryMap.putInt("ellipseMajorAxisRadius", geometry.getEllipseMajorAxisRadius());
        geometryMap.putInt("ellipseMinorAxisRadius", geometry.getEllipseMinorAxisRadius());
        geometryMap.putDouble("ellipseAngle", geometry.getEllipseAngle());

        return geometryMap;
    }

    public static WritableMap recogResultData2Map(RecogResultData recogResultData) {
        if (recogResultData == null) {
            return null;
        }
        WritableMap map = Arguments.createMap();
        map.putString("predict_name", recogResultData.get_predict_name());
        map.putInt("up_left_point_x", recogResultData.get_up_left_point_x());
        map.putInt("up_left_point_y", recogResultData.get_up_left_point_y());
        map.putInt("key_point_x", recogResultData.get_key_point_x());
        map.putInt("key_point_y", recogResultData.get_key_point_y());
        map.putInt("down_right_point_x", recogResultData.get_down_right_point_x());
        map.putInt("down_right_point_y", recogResultData.get_down_right_point_y());
        return map;
    }

    public static WritableMap stroke2Map(Stroke stroke) {
        WritableMap strokeData = Arguments.createMap();

        strokeData.putInt(TrailKey.STROKE_PEN_COLOR, stroke.getPenColor());
        strokeData.putInt(TrailKey.STROKE_PEN_TYPE, stroke.getPenType());
        // strokeData.putInt(TrailKey.STROKE_REC_MOD, stroke.getRecMod());

        // Convert points list
        if (stroke.getPoints() != null) {
            /*
             * WritableArray pointsArray = Arguments.createArray();
             * for (Point point : stroke.getPoints()) {
             * WritableMap pointMap = Arguments.createMap();
             * pointMap.putInt("x", point.x);
             * pointMap.putInt("y", point.y);
             * pointsArray.pushMap(pointMap);
             * }
             * strokeData.putArray(TrailKey.STROKE_POINTS, pointsArray);
             */
            strokeData.putInt(TrailKey.STROKE_POINTS, stroke.getPoints().size());
        }

        // Convert pressures list
        if (stroke.getPressures() != null) {
            /*
             * WritableArray pressuresArray = Arguments.createArray();
             * for (Short pressure : stroke.getPressures()) {
             * pressuresArray.pushInt(pressure.intValue());
             * }
             * strokeData.putArray(TrailKey.STROKE_PRESSURES, pressuresArray);
             */
            strokeData.putInt(TrailKey.STROKE_PRESSURES, stroke.getPressures().size());
        }

        // Convert eraseLineTrailNums list
        if (stroke.getEraseLineTrailNums() != null) {
            /*
             * WritableArray eraseArray = Arguments.createArray();
             * for (Integer num : stroke.getEraseLineTrailNums()) {
             * eraseArray.pushInt(num);
             * }
             * strokeData.putArray(TrailKey.STROKE_ERASE_LINE_TRAIL_NUMS, eraseArray);
             */
            strokeData.putInt(TrailKey.STROKE_ERASE_LINE_TRAIL_NUMS, stroke.getEraseLineTrailNums().size());
        }

        if (stroke.getFlagDraw() != null) {
            /*
             * WritableArray flagDrawArray = Arguments.createArray();
             * for (Boolean flag : stroke.getFlagDraw()) {
             * flagDrawArray.pushBoolean(flag);
             * }
             * strokeData.putArray(TrailKey.STROKE_FLAG_DRAW, flagDrawArray);
             */
            strokeData.putInt(TrailKey.STROKE_FLAG_DRAW, stroke.getFlagDraw().size());
        }

        if (stroke.getMarkPenDirection() != null) {
            /*
             * WritableArray markPenDirectionArray = Arguments.createArray();
             * for (PointF point : stroke.getMarkPenDirection()) {
             * WritableMap pointMap = Arguments.createMap();
             * pointMap.putDouble("x", point.x);
             * pointMap.putDouble("y", point.y);
             * markPenDirectionArray.pushMap(pointMap);
             * }
             * strokeData.putArray(TrailKey.STROKE_MARK_PEN_DIRECTION,
             * markPenDirectionArray);
             */
            strokeData.putInt(TrailKey.STROKE_MARK_PEN_DIRECTION, stroke.getMarkPenDirection().size());
        }

        if (stroke.getRecognPoints() != null) {
            /*
             * WritableArray recognPointsArray = Arguments.createArray();
             * for (RecognData recognData : stroke.getRecognPoints()) {
             * recognPointsArray.pushMap(recognData2Map(recognData));
             * }
             * strokeData.putArray(TrailKey.STROKE_RECOGN_POINTS, recognPointsArray);
             */
            strokeData.putInt(TrailKey.STROKE_RECOGN_POINTS, stroke.getRecognPoints().size());
        }

        return strokeData;
    }

    public static WritableMap recognData2Map(RecognData recognData) {
        WritableMap recognDataMap = Arguments.createMap();
        if (recognData == null) {
            return recognDataMap;
        }
        recognDataMap.putInt("x", recognData.get_x());
        recognDataMap.putInt("y", recognData.get_y());
        recognDataMap.putInt("flag", recognData.get_flag());
        recognDataMap.putDouble("timestamp", recognData.get_timestamp());
        return recognDataMap;
    }

    public static WritableMap title2Map(TitleTrail title) {
        if (title == null) {
            return null;
        }
        WritableMap titleData = Arguments.createMap();

        titleData.putInt(TrailKey.TITLE_X, title.getX());
        titleData.putInt(TrailKey.TITLE_Y, title.getY());
        titleData.putInt(TrailKey.TITLE_WIDTH, title.getWidth());
        titleData.putInt(TrailKey.TITLE_HEIGHT, title.getHeight());
        titleData.putInt(TrailKey.TITLE_PAGE, title.getPage());
        titleData.putInt(TrailKey.TITLE_NUM, title.getNum());
        titleData.putInt(TrailKey.TITLE_INDEX, title.getIndex());
        titleData.putInt(TrailKey.TITLE_PAGE_SEQ, title.getPageSeq());
        titleData.putInt(TrailKey.TITLE_STYLE, title.getStyle());

        // Controlled stroke conversion
        if (title.getControlTrailNums() != null && !title.getControlTrailNums().isEmpty()) {
            WritableArray eraseArray = Arguments.createArray();
            for (Integer num : title.getControlTrailNums()) {
                eraseArray.pushInt(num);
            }
            titleData.putArray(TrailKey.CONTROL_TRAIL_NUMS, eraseArray);
        }

        /*
         * if (title.getRectPoints() != null && !title.getRectPoints().isEmpty()) {
         * titleData.putArray(TrailKey.RECT_POINTS,
         * points2ArrayMap(title.getRectPoints()));
         * }
         */

        return titleData;
    }

    public static WritableMap text2Map(TextBox textBox) {
        if (textBox == null) {
            return null;
        }
        WritableMap textBoxData = Arguments.createMap();

        textBoxData.putDouble(TrailKey.TEXT_BOX_FONT_SIZE, textBox.fontSize);

        if (textBox.fontPath != null) {
            textBoxData.putString(TrailKey.TEXT_BOX_FONT_PATH, textBox.fontPath);
        }
        if (textBox.textContentFull != null) {
            textBoxData.putString(TrailKey.TEXT_BOX_TEXT_CONTENT_FULL, textBox.textContentFull);
        }

        // Convert Rect
        if (textBox.textRect != null) {
            WritableMap rectMap = Arguments.createMap();
            rectMap.putInt("left", textBox.textRect.left);
            rectMap.putInt("top", textBox.textRect.top);
            rectMap.putInt("right", textBox.textRect.right);
            rectMap.putInt("bottom", textBox.textRect.bottom);
            textBoxData.putMap(TrailKey.TEXT_BOX_TEXT_RECT, rectMap);
        }

        // textBoxData.putDouble(TrailKey.TEXT_BOX_TEXT_LINE_HEIGHT,
        // textBox.textLineHeight);

        if (textBox.textDigestData != null) {
            textBoxData.putString(TrailKey.TEXT_BOX_TEXT_DIGEST_DATA, textBox.textDigestData);
        }

        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_TYPE, textBox.textType);
        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_COLOR, textBox.textColor);
        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_TYPEFACE, textBox.textTypeface);
        // textBoxData.putDouble(TrailKey.TEXT_BOX_LETTER_SPACING,
        // textBox.letterSpacing);
        // textBoxData.putDouble(TrailKey.TEXT_BOX_LINE_SPACING_EXTRA,
        // textBox.lineSpacingExtra);
        // textBoxData.putDouble(TrailKey.TEXT_BOX_LINE_SPACING_MULTIPLIER,
        // textBox.lineSpacingMultiplier);
        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_ALIGN, textBox.textAlign);
        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_ANTI_ALIAS, textBox.textAntiAlias);
        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_BOLD, textBox.textBold);
        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_SHADOW_LAYER,
        // textBox.textShadowLayer);
        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_VERTICAL, textBox.textVertical);
        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_ITALICS, textBox.textItalics);
        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_FRAME_WIDTH_TYPE, textBox.textFrameWidthType);
        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_FRAME_WIDTH, textBox.textFrameWidth);
        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_FRAME_STYLE, textBox.textFrameStyle);
        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_FRAME_STROKE_COLOR,
        // textBox.textFrameStrokeColor);
        // textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_FRAME_FILL_COLOR,
        // textBox.textFrameFillColor);
        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_EDITABLE, textBox.textEditable);

        textBoxData.putInt(TrailKey.TEXT_BOX_TEXT_LAYER, textBox.textLayer);

        return textBoxData;
    }

    public static WritableMap lassoTrailTypeNum2Map(LassoTrailTypeNum lassoTrailTypeNum) {
        WritableMap map = Arguments.createMap();

        if (lassoTrailTypeNum == null) {
            return map;
        }

        // Stroke link
        if (lassoTrailTypeNum.trailLinkNum > 0) {
            map.putInt("trailLinkNum", lassoTrailTypeNum.trailLinkNum);
        }

        // Plain text link
        if (lassoTrailTypeNum.textLinkNum > 0) {
            map.putInt("textLinkNum", lassoTrailTypeNum.textLinkNum);
        }

        // TODO link
        if (lassoTrailTypeNum.todoLinkNum > 0) {
            map.putInt("todoLinkNum", lassoTrailTypeNum.todoLinkNum);
        }

        // Title count
        if (lassoTrailTypeNum.titleNum > 0) {
            map.putInt("titleNum", lassoTrailTypeNum.titleNum);
        }

        // Image count
        if (lassoTrailTypeNum.bitmapNum > 0) {
            map.putInt("bitmapNum", lassoTrailTypeNum.bitmapNum);
        }

        // Text box count
        if (lassoTrailTypeNum.normalTextBoxNum > 0) {
            map.putInt("normalTextBoxNum", lassoTrailTypeNum.normalTextBoxNum);
        }

        // Digest text boxes (non-editable) count
        if (lassoTrailTypeNum.digestTextBoxNum > 0) {
            map.putInt("digestTextBoxNum", lassoTrailTypeNum.digestTextBoxNum);
        }

        // Digest text boxes (editable) count
        if (lassoTrailTypeNum.digestTextBoxEditableNum > 0) {
            map.putInt("digestTextBoxEditableNum", lassoTrailTypeNum.digestTextBoxEditableNum);
        }

        // Total geometry count
        if (lassoTrailTypeNum.geometryNum > 0) {
            map.putInt("geometryNum", lassoTrailTypeNum.geometryNum);
        }

        // Straight line count
        if (lassoTrailTypeNum.straightLineNum > 0) {
            map.putInt("straightLineNum", lassoTrailTypeNum.straightLineNum);
        }

        // Curve count
        if (lassoTrailTypeNum.curveLineNum > 0) {
            map.putInt("curveLineNum", lassoTrailTypeNum.curveLineNum);
        }

        // Circle count
        if (lassoTrailTypeNum.circleNum > 0) {
            map.putInt("circleNum", lassoTrailTypeNum.circleNum);
        }

        // Ellipse count
        if (lassoTrailTypeNum.ellipseNum > 0) {
            map.putInt("ellipseNum", lassoTrailTypeNum.ellipseNum);
        }

        if (lassoTrailTypeNum.polygonNum > 0) {
            map.putInt("polygonNum", lassoTrailTypeNum.polygonNum);
        }

        // Regular stroke count
        if (lassoTrailTypeNum.trailNum > 0) {
            map.putInt("trailNum", lassoTrailTypeNum.trailNum);
        }

        return map;
    }

    /**
     * Converts a Layer to WritableMap
     */
    public static WritableMap layer2Map(Layer layer) {
        WritableMap layerMap = Arguments.createMap();

        if (layer == null) {
            return layerMap;
        }

        layerMap.putInt(LayerKey.LAYER_ID, layer.getLayerId());
        layerMap.putString(LayerKey.LAYER_NAME, layer.getName());
        layerMap.putBoolean(LayerKey.LAYER_IS_CURRENT_LAYER, layer.isCurrentLayer());
        layerMap.putBoolean(LayerKey.LAYER_IS_VISIBLE, layer.isVisible());

        return layerMap;
    }

    public static Layer map2Layer(ReadableMap map) throws PluginException {
        if (map == null) {
            return null;
        }
        Layer layer = new Layer();
        if (!map.hasKey(LayerKey.LAYER_ID) || map.isNull(LayerKey.LAYER_ID)
                || !map.hasKey(LayerKey.LAYER_NAME) || map.isNull(LayerKey.LAYER_NAME)) {
            throw new PluginException(PluginAPIError.API_PARAMS_INVALID);
        }
        layer.setLayerId(
                (map.hasKey(LayerKey.LAYER_ID) && !map.isNull(LayerKey.LAYER_ID)) ? map.getInt(LayerKey.LAYER_ID) : 0);
        layer.setName((map.hasKey(LayerKey.LAYER_NAME) && !map.isNull(LayerKey.LAYER_NAME))
                ? map.getString(LayerKey.LAYER_NAME)
                : "");
        layer.setCurrentLayer(
                (map.hasKey(LayerKey.LAYER_IS_CURRENT_LAYER) && !map.isNull(LayerKey.LAYER_IS_CURRENT_LAYER))
                        ? map.getBoolean(LayerKey.LAYER_IS_CURRENT_LAYER)
                        : false);
        layer.setVisible((map.hasKey(LayerKey.LAYER_IS_VISIBLE) && !map.isNull(LayerKey.LAYER_IS_VISIBLE))
                ? map.getBoolean(LayerKey.LAYER_IS_VISIBLE)
                : true);
        return layer;
    }

    /**
     * Converts a KeyWord to WritableMap
     */
    public static WritableMap keyWord2Map(KeyWord keyWord) {
        WritableMap map = Arguments.createMap();

        if (keyWord == null) {
            return map;
        }

        if (keyWord.getKeyword() != null) {
            map.putString("keyword", keyWord.getKeyword());
        }
        map.putInt("page", keyWord.getPage());
        map.putInt("index", keyWord.getIndex());

        return map;
    }

    /**
     * Converts ReadableMap to TextBox
     *
     * @param textMap ReadableMap
     * @return TextBox
     */
    public static TextBox readableMap2TextBox(ReadableMap textMap) throws PluginException {
        if (textMap == null) {
            return null;
        }

        // Create TextBox
        TextBox textBox = new TextBox();

        // Extract values from textMap and populate TextBox
        if (textMap.hasKey(TextKey.fontSize) && !textMap.isNull(TextKey.fontSize)) {
            textBox.fontSize = (float) textMap.getDouble(TextKey.fontSize);
        }
        if (textMap.hasKey(TextKey.fontPath) && !textMap.isNull(TextKey.fontPath)) {
            textBox.fontPath = textMap.getString(TextKey.fontPath);
        }
        if (textMap.hasKey(TextKey.textContentFull) && !textMap.isNull(TextKey.textContentFull)) {
            textBox.textContentFull = textMap.getString(TextKey.textContentFull);
            if (TextUtils.isEmpty(textBox.textContentFull)) {
                throw new PluginException(PluginAPIError.TEXT_CONTENT_EMPTY);
            }
        } else {

            throw new PluginException(PluginAPIError.TEXT_CONTENT_EMPTY);

        }
        if (textMap.hasKey(TextKey.textRect) && !textMap.isNull(TextKey.textRect)) {
            ReadableMap rectMap = textMap.getMap(TextKey.textRect);
            if (rectMap != null) {
                int left = (rectMap.hasKey("left") && !rectMap.isNull("left")) ? rectMap.getInt("left") : 0;
                int top = (rectMap.hasKey("top") && !rectMap.isNull("top")) ? rectMap.getInt("top") : 0;
                int right = (rectMap.hasKey("right") && !rectMap.isNull("right")) ? rectMap.getInt("right") : 0;
                int bottom = (rectMap.hasKey("bottom") && !rectMap.isNull("bottom")) ? rectMap.getInt("bottom") : 0;
                if (Math.abs(left) > 2560 * 2 || Math.abs(top) > 2560 * 2
                        || Math.abs(right) > 2560 * 2 || Math.abs(bottom) > 2560 * 2) {
                    throw new PluginException(PluginAPIError.TEXT_RECT);
                }

                textBox.textRect = new Rect(left, top, right, bottom);
            }
            if (textBox.textRect.height() <= 0 || textBox.textRect.width() <= 0) {
                throw new PluginException(PluginAPIError.TEXT_RECT);
            }
        }
        /*
         * if (textMap.hasKey(TextKey.textLineHeight)) {
         * textBox.textLineHeight = (float) textMap.getDouble(TextKey.textLineHeight);
         * }
         */
        if (textMap.hasKey(TextKey.textDigestData)) {
            textBox.textDigestData = textMap.getString(TextKey.textDigestData);
        }
        /*
         * if (textMap.hasKey(TextKey.textType)) {
         * textBox.textType = textMap.getInt(TextKey.textType);
         * }
         */
        /*
         * if (textMap.hasKey(TextKey.textColor)) {
         * textBox.textColor = textMap.getInt(TextKey.textColor);
         * }
         */
        /*
         * if (textMap.hasKey(TextKey.textTypeface)) {
         * textBox.textTypeface = textMap.getInt(TextKey.textTypeface);
         * }
         */
        /*
         * if (textMap.hasKey(TextKey.letterSpacing)) {
         * textBox.letterSpacing = (float) textMap.getDouble(TextKey.letterSpacing);
         * }
         */
        /*
         * if (textMap.hasKey(TextKey.lineSpacingExtra)) {
         * textBox.lineSpacingExtra = (float)
         * textMap.getDouble(TextKey.lineSpacingExtra);
         * }
         * if (textMap.hasKey(TextKey.lineSpacingMultiplier)) {
         * textBox.lineSpacingMultiplier = (float)
         * textMap.getDouble(TextKey.lineSpacingMultiplier);
         * }
         */
        if (textMap.hasKey(TextKey.textAlign) && !textMap.isNull(TextKey.textAlign)) {
            textBox.textAlign = textMap.getInt(TextKey.textAlign);
            if (!TextBox.TEXT_ALIGN_VALUES.contains(textBox.textAlign)) {
                throw new PluginException(PluginAPIError.TEXT_ALIGN);
            }

        }
        /*
         * if (textMap.hasKey(TextKey.textAntiAlias)) {
         * textBox.textAntiAlias = textMap.getInt(TextKey.textAntiAlias);
         * }
         */
        if (textMap.hasKey(TextKey.textBold) && !textMap.isNull(TextKey.textBold)) {
            textBox.textBold = textMap.getInt(TextKey.textBold);
            if (!TextBox.TEXT_BOLD_VALUES.contains(textBox.textBold)) {
                throw new PluginException(PluginAPIError.TEXT_BOLD);
            }
        }
        /*
         * if (textMap.hasKey(TextKey.textShadowLayer)) {
         * textBox.textShadowLayer = textMap.getInt(TextKey.textShadowLayer);
         * }
         * if (textMap.hasKey(TextKey.textVertical)) {
         * textBox.textVertical = textMap.getInt(TextKey.textVertical);
         * }
         */
        if (textMap.hasKey(TextKey.textItalics) && !textMap.isNull(TextKey.textItalics)) {
            textBox.textItalics = textMap.getInt(TextKey.textItalics);
            if (!TextBox.TEXT_ITALICS_VALUES.contains(textBox.textItalics)) {
                throw new PluginException(PluginAPIError.TEXT_ITALICS);
            }
        }
        if (textMap.hasKey(TextKey.textFrameWidthType) && !textMap.isNull(TextKey.textFrameWidthType)) {
            textBox.textFrameWidthType = textMap.getInt(TextKey.textFrameWidthType);
        }
        if (textMap.hasKey(TextKey.textFrameWidth) && !textMap.isNull(TextKey.textFrameWidth)) {
            textBox.textFrameWidth = textMap.getInt(TextKey.textFrameWidth);
        }
        if (textMap.hasKey(TextKey.textFrameStyle) && !textMap.isNull(TextKey.textFrameStyle)) {
            textBox.textFrameStyle = textMap.getInt(TextKey.textFrameStyle);
        }
        /*
         * if (textMap.hasKey(TextKey.textFrameStrokeColor)) {
         * textBox.textFrameStrokeColor = textMap.getInt(TextKey.textFrameStrokeColor);
         * }
         * if (textMap.hasKey(TextKey.textFrameFillColor)) {
         * textBox.textFrameFillColor = textMap.getInt(TextKey.textFrameFillColor);
         * }
         */
        if (textMap.hasKey(TextKey.textEditable) && !textMap.isNull(TextKey.textEditable)) {
            textBox.textEditable = textMap.getInt(TextKey.textEditable);
        }
        if (textMap.hasKey(TextKey.textLayer) && !textMap.isNull(TextKey.textLayer)) {
            textBox.textLayer = textMap.getInt(TextKey.textLayer);
        }

        return textBox;
    }

    public static List<Trail> readableArray2TrailList(ReadableArray trailArray) throws PluginException {
        if (trailArray == null) {
            return null;
        }

        List<Trail> trailList = new ArrayList<>();

        for (int i = 0; i < trailArray.size(); i++) {
            ReadableMap trailMap = trailArray.getMap(i);
            if (trailMap != null) {
                Trail trail = readableMap2Trail(trailMap);
                if (trail != null) {
                    trailList.add(trail);
                }
            }
        }

        return trailList;
    }

    public static Trail readableMap2Trail(ReadableMap trailMap) throws PluginException {
        if (trailMap == null) {
            return null;
        }
        Trail trail = new Trail();
        return readableMap2Trail(trailMap, trail);
    }

    public static Trail readableMap2Trail(ReadableMap trailMap, Trail trail) throws PluginException {
        if (trailMap == null) {
            return null;
        }

        // Base fields
        if (trailMap.hasKey(TrailKey.UUID) && !trailMap.isNull(TrailKey.UUID)) {
            trail.setUUID(trailMap.getString(TrailKey.UUID));
        }
        // Stroke type changed again; clear contour and angle data
        if (trailMap.hasKey(TrailKey.TYPE) && !trailMap.isNull(TrailKey.TYPE)) {
            int oldType = trail.getType();
            trail.setType(trailMap.getInt(TrailKey.TYPE));
            if (oldType != trail.getType()) {
                trail.getContoursSrc().clear();
                trail.getAngles().clear();
            }

        }
        if (!TRAIL_TYPES.contains(trail.getType())) {
            throw new PluginException(PluginAPIError.TRAIL_ERROR_TYPE);
        }
        /*
         * if (trailMap.hasKey(TrailKey.FLAG_PEN_UP)) {
         * trail.setFlagPenUp(trailMap.getInt(TrailKey.FLAG_PEN_UP));
         * }
         * if (trailMap.hasKey(TrailKey.FLAG_SPECIAL)) {
         * trail.setFlagSpecial(trailMap.getInt(TrailKey.FLAG_SPECIAL));
         * }
         */
        /*
         * if (trailMap.hasKey(TrailKey.PRE_NUM)) {
         * trail.setPreNum(trailMap.getInt(TrailKey.PRE_NUM));
         * }
         */
        if (trailMap.hasKey(TrailKey.PAGE_NUM) && !trailMap.isNull(TrailKey.PAGE_NUM)) {
            trail.setPageNum(trailMap.getInt(TrailKey.PAGE_NUM));
            if (trail.getPageNum() < 0) {
                if (!TRAIL_TYPES.contains(trail.getType())) {
                    throw new PluginException(PluginAPIError.NO_PAGE);
                }
            }
        } else {
            throw new PluginException(PluginAPIError.NO_EMPTY.getCode(),
                    String.format(PluginAPIError.NO_EMPTY.getMessage(), "pageNum"));

        }
        if (trailMap.hasKey(TrailKey.LAYER_NUM) && !trailMap.isNull(TrailKey.LAYER_NUM)) {
            trail.setLayerNum(trailMap.getInt(TrailKey.LAYER_NUM));
            if (trail.getLayerNum() > 3 || trail.getLayerNum() < 0) {
                throw new PluginException(PluginAPIError.LAYER_EXISTS_NO_LAYER_ID);

            }
            int type = trail.getType();
            if (trail.getLayerNum() != 0 && !MAIN_LAYER_TRAIL_TYPES.contains(type)) {
                throw new PluginException(PluginAPIError.TRAIL_TYPE_MAIN_LAYER);
            }
        }
        /*
         * if (trailMap.hasKey(TrailKey.TRAIL_NUM)) {
         * trail.setTrailNum(trailMap.getInt(TrailKey.TRAIL_NUM));
         * }
         */
        if (trailMap.hasKey(TrailKey.TRAIL_NUM_IN_PAGE) && !trailMap.isNull(TrailKey.TRAIL_NUM_IN_PAGE)) {
            trail.setTrailNumInPage(trailMap.getInt(TrailKey.TRAIL_NUM_IN_PAGE));
        }
        if (trailMap.hasKey(TrailKey.MAX_X) && !trailMap.isNull(TrailKey.MAX_X)) {
            trail.setMaxX(trailMap.getInt(TrailKey.MAX_X));
        }
        if (trailMap.hasKey(TrailKey.MAX_Y) && !trailMap.isNull(TrailKey.MAX_Y)) {
            trail.setMaxY(trailMap.getInt(TrailKey.MAX_Y));
        }
        /*
         * if (trailMap.hasKey(TrailKey.FACTOR_RESIZE)) {
         * trail.setFactorResize((float) trailMap.getDouble(TrailKey.FACTOR_RESIZE));
         * }
         * if (trailMap.hasKey(TrailKey.FILTER_FLAG)) {
         * trail.setFilterFlag(trailMap.getBoolean(TrailKey.FILTER_FLAG));
         * }
         */
        /*
         * if (trailMap.hasKey(TrailKey.UUID)) {
         * trail.setUUID(trailMap.getString(TrailKey.UUID));
         * }
         */
        if (trailMap.hasKey(TrailKey.THICKNESS) && !trailMap.isNull(TrailKey.THICKNESS)) {
            trail.setThickness(trailMap.getInt(TrailKey.THICKNESS));
        }
        if (trailMap.hasKey(TrailKey.RECOGNIZE_RESULT) && !trailMap.isNull(TrailKey.RECOGNIZE_RESULT)) {
            ReadableMap recognizeMap = trailMap.getMap(TrailKey.RECOGNIZE_RESULT);
            trail.setRecognizeResult(readableMap2RecogResultData(recognizeMap));
        }
        /*
         * if (trailMap.hasKey(TrailKey.TRAIL_STATUS)) {
         * trail.setTrailStatus(trailMap.getInt(TrailKey.TRAIL_STATUS));
         * }
         */
        /*
         * if (trailMap.hasKey(TrailKey.CONTOURS_SRC)) {
         * ReadableArray contourArray = trailMap.getArray(TrailKey.CONTOURS_SRC);
         * if (contourArray != null) {
         * List<List<PointF>> contoursSrc = new ArrayList<>();
         * for (int i = 0; i < contourArray.size(); i++) {
         * ReadableArray pointArray = contourArray.getArray(i);
         * if (pointArray != null) {
         * List<PointF> pointFS = new ArrayList<>();
         * for (int j = 0; j < pointArray.size(); j++) {
         * ReadableMap pointMap = pointArray.getMap(j);
         * if (pointMap != null) {
         * PointF pointF = new PointF();
         * pointF.x = (float) pointMap.getDouble("x");
         * pointF.y = (float) pointMap.getDouble("y");
         * pointFS.add(pointF);
         * }
         * }
         * contoursSrc.add(pointFS);
         * }
         * }
         * trail.setContoursSrc(contoursSrc);
         * }
         * }
         */

        // Handle angles array
        /*
         * if (trailMap.hasKey(TrailKey.ANGLES)) {
         * ReadableArray anglesArray = trailMap.getArray(TrailKey.ANGLES);
         * if (anglesArray != null) {
         * List<Point> anglesList = new ArrayList<>();
         * for (int i = 0; i < anglesArray.size(); i++) {
         * ReadableMap pointMap = anglesArray.getMap(i);
         * if (pointMap != null) {
         * int x = pointMap.hasKey("x") ? pointMap.getInt("x") : 0;
         * int y = pointMap.hasKey("y") ? pointMap.getInt("y") : 0;
         * anglesList.add(new Point(x, y));
         * }
         * }
         * trail.setAngles(anglesList);
         * }
         * }
         */

        /*
         * if (trailMap.hasKey(TrailKey.REDRAW_WIDTH)) {
         * trail.setRedrawWidth(trailMap.getInt(TrailKey.REDRAW_WIDTH));
         * }
         *
         * if (trailMap.hasKey(TrailKey.REDRAW_HEIGHT)) {
         * trail.setRedrawHeight(trailMap.getInt(TrailKey.REDRAW_HEIGHT));
         * }
         */
        /*
         * if (trailMap.hasKey(TrailKey.DRAW_VERSION)) {
         * trail.setDrawVersion(trailMap.getInt(TrailKey.DRAW_VERSION));
         * }
         */
        /*
         * if (trailMap.hasKey(TrailKey.EMR_POINT_AXIS)) {
         * trail.setEmrPointAxis(trailMap.getInt(TrailKey.EMR_POINT_AXIS));
         * }
         */

        // Handle nested objects
        if (trailMap.hasKey(TrailKey.STROKE) && !trailMap.isNull(TrailKey.STROKE)) {
            ReadableMap strokeMap = trailMap.getMap(TrailKey.STROKE);
            trail.setStroke(readableMap2Stroke(strokeMap, trail.getStroke()));
        }

        if (trailMap.hasKey(TrailKey.LINK) && !trailMap.isNull(TrailKey.LINK)) {
            ReadableMap linkTrailMap = trailMap.getMap(TrailKey.LINK);
            trail.setLink(readableMap2LinkTrail(linkTrailMap));
        }

        if (trailMap.hasKey(TrailKey.TITLE) && !trailMap.isNull(TrailKey.TITLE)) {
            ReadableMap titleTrailMap = trailMap.getMap(TrailKey.TITLE);
            trail.setTitle(readableMap2TitleTrail(titleTrailMap));
        }

        if (trailMap.hasKey(TrailKey.TEXT_BOX) && !trailMap.isNull(TrailKey.TEXT_BOX)) {
            ReadableMap textBoxMap = trailMap.getMap(TrailKey.TEXT_BOX);
            // Call existing helper directly
            trail.setTextBox(readableMap2TextBox(textBoxMap));
        }
        if (trailMap.hasKey(TrailKey.GEOMETRY) && !trailMap.isNull(TrailKey.GEOMETRY)) {
            ReadableMap geometryMap = trailMap.getMap(TrailKey.GEOMETRY);
            // Call existing helper directly
            trail.setGeometry(readableMap2Geometry(geometryMap));
        }

        if (trailMap.hasKey(TrailKey.FIVE_STAR) && !trailMap.isNull(TrailKey.FIVE_STAR)) {
            ReadableMap fiveStar = trailMap.getMap(TrailKey.FIVE_STAR);
            trail.setFiveStar(readableMap2FiveStar(fiveStar));
        }

        if(trailMap.hasKey(TrailKey.PICTURE) && !trailMap.isNull(TrailKey.PICTURE)) {
            ReadableMap picture = trailMap.getMap(TrailKey.PICTURE);
            trail.setPicture(map2Picture(picture));
        }

        return trail;
    }

    public static RecogResultData readableMap2RecogResultData(ReadableMap map) {
        if (map == null) {
            return null;
        }
        RecogResultData recogResultData = new RecogResultData();
        if (map.hasKey("predict_name") && !map.isNull("predict_name")) {
            recogResultData.set_predict_name(map.getString("predict_name"));
        }
        if (map.hasKey("up_left_point_x") && !map.isNull("up_left_point_x")) {
            recogResultData.set_up_left_point_x(map.getInt("up_left_point_x"));
        }
        if (map.hasKey("up_left_point_y") && !map.isNull("up_left_point_y")) {
            recogResultData.set_up_left_point_y(map.getInt("up_left_point_y"));
        }
        if (map.hasKey("key_point_x") && !map.isNull("key_point_x")) {
            recogResultData.set_key_point_x(map.getInt("key_point_x"));
        }
        if (map.hasKey("key_point_y") && !map.isNull("key_point_y")) {
            recogResultData.set_key_point_y(map.getInt("key_point_y"));
        }
        if (map.hasKey("down_right_point_x") && !map.isNull("down_right_point_x")) {
            recogResultData.set_down_right_point_x(map.getInt("down_right_point_x"));
        }
        if (map.hasKey("down_right_point_y") && !map.isNull("down_right_point_y")) {
            recogResultData.set_down_right_point_y(map.getInt("down_right_point_y"));
        }
        return recogResultData;
    }

    private static Stroke readableMap2Stroke(ReadableMap strokeMap) throws PluginException {
        if (strokeMap == null) {
            return null;
        }

        Stroke stroke = new Stroke();
        return readableMap2Stroke(strokeMap, stroke);
    }

    // Helper: Stroke conversion
    private static Stroke readableMap2Stroke(ReadableMap strokeMap, Stroke stroke) throws PluginException {
        if (strokeMap == null || stroke == null) {
            return null;
        }

        if (strokeMap.hasKey(TrailKey.STROKE_PEN_COLOR) && !strokeMap.isNull(TrailKey.STROKE_PEN_COLOR)) {
            stroke.setPenColor(strokeMap.getInt(TrailKey.STROKE_PEN_COLOR));
            if (!PEN_COLORS.contains(stroke.getPenColor())) {
                throw new PluginException(PluginAPIError.STROKE_PEN_COLOR);
            }
        }
        if (strokeMap.hasKey(TrailKey.STROKE_PEN_TYPE) && !strokeMap.isNull(TrailKey.STROKE_PEN_TYPE)) {
            stroke.setPenType(strokeMap.getInt(TrailKey.STROKE_PEN_TYPE));
            if (!PEN_TYPES.contains(stroke.getPenType())) {
                throw new PluginException(PluginAPIError.STROKE_PEN_TYPE);
            }
        }
        /*
         * if (strokeMap.hasKey(TrailKey.STROKE_REC_MOD)) {
         * stroke.setRecMod(strokeMap.getInt(TrailKey.STROKE_REC_MOD));
         * }
         */
        /*
         * if (strokeMap.hasKey(TrailKey.STROKE_POINTS)) {
         * ReadableArray pointsArray = strokeMap.getArray(TrailKey.STROKE_POINTS);
         * if (pointsArray != null) {
         * List<Point> pointsList = new ArrayList<>();
         * for (int i = 0; i < pointsArray.size(); i++) {
         * ReadableMap pointMap = pointsArray.getMap(i);
         * if (pointMap != null) {
         * int x = pointMap.hasKey("x") ? pointMap.getInt("x") : 0;
         * int y = pointMap.hasKey("y") ? pointMap.getInt("y") : 0;
         * pointsList.add(new Point(x, y));
         * }
         * }
         * stroke.setPoints(pointsList);
         * }
         * }
         */
        // Add pressures field handling
        /*
         * if (strokeMap.hasKey(TrailKey.STROKE_PRESSURES)) {
         * ReadableArray pressuresArray = strokeMap.getArray(TrailKey.STROKE_PRESSURES);
         * if (pressuresArray != null) {
         * List<Short> pressures = new ArrayList<>();
         * for (int i = 0; i < pressuresArray.size(); i++) {
         * pressures.add((short) pressuresArray.getInt(i));
         * }
         * stroke.setPressures(pressures);
         * }
         * }
         */
        // Add eraseLineTrailNums field handling
        /*
         * if (strokeMap.hasKey(TrailKey.STROKE_ERASE_LINE_TRAIL_NUMS)) {
         * ReadableArray eraseLineArray =
         * strokeMap.getArray(TrailKey.STROKE_ERASE_LINE_TRAIL_NUMS);
         * if (eraseLineArray != null) {
         * List<Integer> eraseLineTrailNums = new ArrayList<>();
         * for (int i = 0; i < eraseLineArray.size(); i++) {
         * eraseLineTrailNums.add(eraseLineArray.getInt(i));
         * }
         * stroke.setEraseLineTrailNums(eraseLineTrailNums);
         * }
         * }
         */
        // Add flagDraw field handling
        /*
         * if (strokeMap.hasKey(TrailKey.STROKE_FLAG_DRAW)) {
         * ReadableArray flagDrawArray = strokeMap.getArray(TrailKey.STROKE_FLAG_DRAW);
         * if (flagDrawArray != null) {
         * List<Boolean> flagDraw = new ArrayList<>();
         * for (int i = 0; i < flagDrawArray.size(); i++) {
         * flagDraw.add(flagDrawArray.getBoolean(i));
         * }
         * stroke.setFlagDraw(flagDraw);
         * }
         * }
         */
        // Add markPenDirection field handling
        /*
         * if (strokeMap.hasKey(TrailKey.STROKE_MARK_PEN_DIRECTION)) {
         * ReadableArray markPenDirectionArray =
         * strokeMap.getArray(TrailKey.STROKE_MARK_PEN_DIRECTION);
         * if (markPenDirectionArray != null) {
         * List<PointF> markPenDirection = new ArrayList<>();
         * for (int i = 0; i < markPenDirectionArray.size(); i++) {
         * ReadableMap pointMap = markPenDirectionArray.getMap(i);
         * if (pointMap != null) {
         * float x = pointMap.hasKey("x") ? (float) pointMap.getDouble("x") : 0;
         * float y = pointMap.hasKey("y") ? (float) pointMap.getDouble("y") : 0;
         * markPenDirection.add(new PointF(x, y));
         * }
         * }
         * stroke.setMarkPenDirection(markPenDirection);
         * }
         * }
         */
        // Add recognPoints field handling
        /*
         * if (strokeMap.hasKey(TrailKey.STROKE_RECOGN_POINTS)) {
         * ReadableArray recognPointsArray =
         * strokeMap.getArray(TrailKey.STROKE_RECOGN_POINTS);
         * if (recognPointsArray != null) {
         * List<RecognData> recognPoints = new ArrayList<>();
         * for (int i = 0; i < recognPointsArray.size(); i++) {
         * ReadableMap recognDataMap = recognPointsArray.getMap(i);
         * if (recognDataMap != null) {
         * recognPoints.add(readableMap2RecognData(recognDataMap));
         * }
         * }
         * stroke.setRecognPoints(recognPoints);
         * }
         * }
         */

        return stroke;
    }

    public static RecognData readableMap2RecognData(ReadableMap recognDataMap) {
        if (recognDataMap == null) {
            return null;
        }
        int x = (recognDataMap.hasKey("x") && !recognDataMap.isNull("x")) ? recognDataMap.getInt("x") : 0;
        int y = (recognDataMap.hasKey("y") && !recognDataMap.isNull("y")) ? recognDataMap.getInt("y") : 0;
        int flag = (recognDataMap.hasKey("flag") && !recognDataMap.isNull("flag")) ? recognDataMap.getInt("flag") : 0;
        long timestamp = (recognDataMap.hasKey("timestamp") && !recognDataMap.isNull("timestamp"))
                ? (long) recognDataMap.getDouble("timestamp")
                : -1;
        return new RecognData(x, y, flag, timestamp);
    }

    public static WritableMap lassoLink2Map(LinkTrail link) {
        if (link == null) {
            return null;
        }
        WritableMap linkData = Arguments.createMap();

        linkData.putInt(TrailKey.LINK_CATEGORY, link.getCategory());
        /*
         * linkData.putInt(TrailKey.LINK_X, link.getX());
         * linkData.putInt(TrailKey.LINK_Y, link.getY());
         * linkData.putInt(TrailKey.LINK_WIDTH, link.getWidth());
         * linkData.putInt(TrailKey.LINK_HEIGHT, link.getHeight());
         */
        // linkData.putInt(TrailKey.LINK_PAGE, link.getPage());

        // Remove num and index (unused)
        /*
         * linkData.putInt(TrailKey.LINK_NUM, link.getNum());
         * linkData.putInt(TrailKey.LINK_INDEX, link.getIndex());
         */
        // linkData.putInt(TrailKey.LINK_PAGE_SEQ, link.getPageSeq());
        linkData.putInt(TrailKey.LINK_STYLE, link.getStyle());
        // linkData.putInt(TrailKey.LINK_LINK_INOUT, link.getLinkInout());
        linkData.putInt(TrailKey.LINK_LINK_TYPE, link.getLinkType());

        /*
         * if (link.getLinkTimestamp() != null) {
         * linkData.putString(TrailKey.LINK_LINK_TIMESTAMP, link.getLinkTimestamp());
         * }
         */
        if (link.getDestFilePath() != null) {
            linkData.putString(TrailKey.LINK_DEST_FILE_PATH, link.getDestFilePath());
        }
        /*
         * if (link.getDestFileId() != null) {
         * linkData.putString(TrailKey.LINK_DEST_FILE_ID, link.getDestFileId());
         * }
         */
        /*
         * if (link.getDestPageId() != null) {
         * linkData.putString(TrailKey.LINK_DEST_PAGE_ID, link.getDestPageId());
         * }
         */

        linkData.putInt(TrailKey.LINK_DEST_PAGE_NUM, link.getDestPageNum());
        // linkData.putDouble(TrailKey.LINK_FONT_SIZE, link.getFontSize());

        /*
         * if (link.getFontPath() != null) {
         * linkData.putString(TrailKey.LINK_FONT_PATH, link.getFontPath());
         * }
         */
        if (link.getFullText() != null) {
            linkData.putString(TrailKey.LINK_FULL_TEXT, link.getFullText());
        }
        if (link.getShowText() != null) {
            linkData.putString(TrailKey.LINK_SHOW_TEXT, link.getShowText());
        }

        linkData.putInt(TrailKey.LINK_ITALIC, link.getItalic());
        /*
         * linkData.putInt(TrailKey.LINK_ANTI, link.getAnti());
         * linkData.putInt(TrailKey.LINK_BOLD, link.getBold());
         *
         * linkData.putInt(TrailKey.LINK_NEW_DEST_PAGE_NUM, link.getNewDestPageNum());
         */

        /*
         * if (link.getRectPoints() != null && !link.getRectPoints().isEmpty()) {
         * linkData.putArray(TrailKey.RECT_POINTS,
         * points2ArrayMap(link.getRectPoints()));
         * }
         */

        return linkData;
    }

    public static WritableMap linkData2Map(LinkTrail link) {
        if (link == null) {
            return null;
        }
        WritableMap linkData = Arguments.createMap();

        linkData.putInt(TrailKey.LINK_CATEGORY, link.getCategory());
        linkData.putInt(TrailKey.LINK_X, link.getX());
        linkData.putInt(TrailKey.LINK_Y, link.getY());
        linkData.putInt(TrailKey.LINK_WIDTH, link.getWidth());
        linkData.putInt(TrailKey.LINK_HEIGHT, link.getHeight());
        // linkData.putInt(TrailKey.LINK_PAGE, link.getPage());
        // Remove num and index (unused)
        // linkData.putInt(TrailKey.LINK_NUM, link.getNum());
        // linkData.putInt(TrailKey.LINK_INDEX, link.getIndex());
        // linkData.putInt(TrailKey.LINK_PAGE_SEQ, link.getPageSeq());
        linkData.putInt(TrailKey.LINK_STYLE, link.getStyle());
        // linkData.putInt(TrailKey.LINK_LINK_INOUT, link.getLinkInout());
        linkData.putInt(TrailKey.LINK_LINK_TYPE, link.getLinkType());

        /*
         * if (link.getLinkTimestamp() != null) {
         * linkData.putString(TrailKey.LINK_LINK_TIMESTAMP, link.getLinkTimestamp());
         * }
         */
        if (link.getDestFilePath() != null) {
            linkData.putString(TrailKey.LINK_DEST_FILE_PATH, link.getDestFilePath());
        }
        /*
         * if (link.getDestFileId() != null) {
         * linkData.putString(TrailKey.LINK_DEST_FILE_ID, link.getDestFileId());
         * }
         */
        /*
         * if (link.getDestPageId() != null) {
         * linkData.putString(TrailKey.LINK_DEST_PAGE_ID, link.getDestPageId());
         * }
         */

        linkData.putInt(TrailKey.LINK_DEST_PAGE_NUM, link.getDestPageNum());
        linkData.putDouble(TrailKey.LINK_FONT_SIZE, link.getFontSize());

        if (link.getFontPath() != null) {
            linkData.putString(TrailKey.LINK_FONT_PATH, link.getFontPath());
        }
        if (link.getFullText() != null) {
            linkData.putString(TrailKey.LINK_FULL_TEXT, link.getFullText());
        }
        if (link.getShowText() != null) {
            linkData.putString(TrailKey.LINK_SHOW_TEXT, link.getShowText());
        }

        linkData.putInt(TrailKey.LINK_ITALIC, link.getItalic());
        /*
         * linkData.putInt(TrailKey.LINK_ANTI, link.getAnti());
         * linkData.putInt(TrailKey.LINK_BOLD, link.getBold());
         *
         * linkData.putInt(TrailKey.LINK_NEW_DEST_PAGE_NUM, link.getNewDestPageNum());
         */
        // Controlled stroke conversion
        if (link.getControlTrailNums() != null && !link.getControlTrailNums().isEmpty()) {
            WritableArray eraseArray = Arguments.createArray();
            for (Integer num : link.getControlTrailNums()) {
                eraseArray.pushInt(num);
            }
            linkData.putArray(TrailKey.CONTROL_TRAIL_NUMS, eraseArray);
        }

        /*
         * if (link.getRectPoints() != null && !link.getRectPoints().isEmpty()) {
         * linkData.putArray(TrailKey.RECT_POINTS,
         * points2ArrayMap(link.getRectPoints()));
         * }
         */

        return linkData;
    }

    // Helper: LinkTrail conversion
    private static LinkTrail readableMap2LinkTrail(ReadableMap linkTrailMap) throws PluginException {
        if (linkTrailMap == null) {
            return null;
        }

        LinkTrail linkTrail = new LinkTrail();

        if (linkTrailMap.hasKey(TrailKey.LINK_CATEGORY) && !linkTrailMap.isNull(TrailKey.LINK_CATEGORY)) {
            linkTrail.setCategory(linkTrailMap.getInt(TrailKey.LINK_CATEGORY));
            if (!LINK_CATEGORIES.contains(linkTrail.getCategory())) {
                throw new PluginException(PluginAPIError.LINK_CATEGORY_ERROR);
            }
        }
        if (linkTrailMap.hasKey(TrailKey.LINK_X) && !linkTrailMap.isNull(TrailKey.LINK_X)) {
            linkTrail.setX(linkTrailMap.getInt(TrailKey.LINK_X));
        }
        if (linkTrailMap.hasKey(TrailKey.LINK_Y) && !linkTrailMap.isNull(TrailKey.LINK_Y)) {
            linkTrail.setY(linkTrailMap.getInt(TrailKey.LINK_Y));
        }
        if (linkTrailMap.hasKey(TrailKey.LINK_WIDTH) && !linkTrailMap.isNull(TrailKey.LINK_WIDTH)) {
            linkTrail.setWidth(linkTrailMap.getInt(TrailKey.LINK_WIDTH));
        }
        if (linkTrailMap.hasKey(TrailKey.LINK_HEIGHT) && !linkTrailMap.isNull(TrailKey.LINK_HEIGHT)) {
            linkTrail.setHeight(linkTrailMap.getInt(TrailKey.LINK_HEIGHT));
        }
        if (linkTrail.getWidth() <= 0 || linkTrail.getHeight() <= 0) {
            throw new PluginException(PluginAPIError.LINK_RECT);
        }

        if (linkTrailMap.hasKey(TrailKey.LINK_STYLE) && !linkTrailMap.isNull(TrailKey.LINK_STYLE)) {
            linkTrail.setStyle(linkTrailMap.getInt(TrailKey.LINK_STYLE));
            if (!LINK_STYLES.contains(linkTrail.getStyle())) {
                throw new PluginException(PluginAPIError.LINK_STYLE_ERROR);
            }
        }
        if (linkTrailMap.hasKey(TrailKey.LINK_LINK_TYPE) && !linkTrailMap.isNull(TrailKey.LINK_LINK_TYPE)) {
            linkTrail.setLinkType(linkTrailMap.getInt(TrailKey.LINK_LINK_TYPE));
            if (!LINK_TYPES.contains(linkTrail.getLinkType())) {
                throw new PluginException(PluginAPIError.LINK_TYPE_ERROR);
            }
        }
        // Set other fields
        /*
         * if (linkTrailMap.hasKey(TrailKey.LINK_PAGE)) {
         * linkTrail.setPage(linkTrailMap.getInt(TrailKey.LINK_PAGE));
         * }
         */
        /*
         * if (linkTrailMap.hasKey(TrailKey.LINK_LINK_INOUT)) {
         * linkTrail.setLinkInout(linkTrailMap.getInt(TrailKey.LINK_LINK_INOUT));
         * }
         */
        /*
         * if (linkTrailMap.hasKey(TrailKey.LINK_LINK_TIMESTAMP)) {
         * linkTrail.setLinkTimestamp(linkTrailMap.getString(TrailKey.
         * LINK_LINK_TIMESTAMP));
         * }
         */
        if (linkTrailMap.hasKey(TrailKey.LINK_DEST_FILE_PATH) && !linkTrailMap.isNull(TrailKey.LINK_DEST_FILE_PATH)) {
            linkTrail.setDestFilePath(linkTrailMap.getString(TrailKey.LINK_DEST_FILE_PATH));
            int linkType = linkTrail.getLinkType();
            if (LINK_FILE_TYPES.contains(linkType)) {
                if (!FileUtils.isFileExists(linkTrail.getDestFilePath())) {
                    throw new PluginException(PluginAPIError.LINK_NO_DEST_FILE);
                }

                if (linkType == 0 || linkType == 1) {
                    if (!FileUtils.isNote(linkTrail.getDestFilePath())) {
                        throw new PluginException(PluginAPIError.LINK_NO_NOTE_FILE);
                    }
                }

            }
        }
        /*
         * if (linkTrailMap.hasKey(TrailKey.LINK_DEST_FILE_ID)) {
         * linkTrail.setDestFileId(linkTrailMap.getString(TrailKey.LINK_DEST_FILE_ID));
         * }
         */
        /*
         * if (linkTrailMap.hasKey(TrailKey.LINK_DEST_PAGE_ID)) {
         * linkTrail.setDestPageId(linkTrailMap.getString(TrailKey.LINK_DEST_PAGE_ID));
         * }
         */
        if (linkTrailMap.hasKey(TrailKey.LINK_DEST_PAGE_NUM) && !linkTrailMap.isNull(TrailKey.LINK_DEST_PAGE_NUM)) {
            linkTrail.setDestPageNum(linkTrailMap.getInt(TrailKey.LINK_DEST_PAGE_NUM));
            if (linkTrail.getDestPageNum() < 0) {
                throw new PluginException(PluginAPIError.LINK_NO_DEST_PAGE);
            }
        } else {
            throw new PluginException(PluginAPIError.LINK_NO_DEST_PAGE);
        }
        // Only text links need these boundary checks
        if (linkTrail.getCategory() == LinkTrail.CATEGORY_TEXT) {
            if (linkTrailMap.hasKey(TrailKey.LINK_FONT_SIZE) && !linkTrailMap.isNull(TrailKey.LINK_FONT_SIZE)) {
                linkTrail.setFontSize((float) linkTrailMap.getDouble(TrailKey.LINK_FONT_SIZE));
            }
            if (linkTrailMap.hasKey(TrailKey.LINK_ITALIC) && !linkTrailMap.isNull(TrailKey.LINK_ITALIC)) {
                linkTrail.setItalic(linkTrailMap.getInt(TrailKey.LINK_ITALIC));
            }
            /*
             * if (linkTrailMap.hasKey(TrailKey.LINK_FONT_PATH)) {
             * linkTrail.setFontPath(linkTrailMap.getString(TrailKey.LINK_FONT_PATH));
             * }
             */
            if (linkTrailMap.hasKey(TrailKey.LINK_FULL_TEXT) && !linkTrailMap.isNull(TrailKey.LINK_FULL_TEXT)) {
                linkTrail.setFullText(linkTrailMap.getString(TrailKey.LINK_FULL_TEXT));
            }
            if (linkTrailMap.hasKey(TrailKey.LINK_SHOW_TEXT) && !linkTrailMap.isNull(TrailKey.LINK_SHOW_TEXT)) {
                linkTrail.setShowText(linkTrailMap.getString(TrailKey.LINK_SHOW_TEXT));
            }
        }

        // Add controlled strokes
        if (linkTrailMap.hasKey(TrailKey.CONTROL_TRAIL_NUMS) && !linkTrailMap.isNull(TrailKey.CONTROL_TRAIL_NUMS)) {
            ReadableArray controlTrailNumArray = linkTrailMap.getArray(TrailKey.CONTROL_TRAIL_NUMS);
            if (linkTrail.getCategory() == 1) {
                if (controlTrailNumArray == null || controlTrailNumArray.size() <= 0) {
                    throw new PluginException(PluginAPIError.LINK_CONTROL_NUM_EMPTY);
                }
            }
            if (controlTrailNumArray != null) {
                List<Integer> controlTrailNums = new ArrayList<>();
                for (int i = 0; i < controlTrailNumArray.size(); i++) {
                    controlTrailNums.add(controlTrailNumArray.getInt(i));
                }
                linkTrail.setControlTrailNums(controlTrailNums);
            }
        }

        /*
         * if (linkTrailMap.hasKey(TrailKey.RECT_POINTS)) {
         * ReadableArray rectPointArray = linkTrailMap.getArray(TrailKey.RECT_POINTS);
         * linkTrail.setRectPoints(arrayMap2Points(rectPointArray));
         * }
         */

        return linkTrail;
    }

    // Helper: TitleTrail conversion
    private static TitleTrail readableMap2TitleTrail(ReadableMap titleTrailMap) throws PluginException {
        if (titleTrailMap == null) {
            return null;
        }

        TitleTrail titleTrail = new TitleTrail();

        if (titleTrailMap.hasKey(TrailKey.TITLE_X)) {
            titleTrail.setX(titleTrailMap.getInt(TrailKey.TITLE_X));
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_Y)) {
            titleTrail.setY(titleTrailMap.getInt(TrailKey.TITLE_Y));
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_WIDTH)) {
            titleTrail.setWidth(titleTrailMap.getInt(TrailKey.TITLE_WIDTH));
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_HEIGHT)) {
            titleTrail.setHeight(titleTrailMap.getInt(TrailKey.TITLE_HEIGHT));
        }

        if (titleTrail.getHeight() <= 0 || titleTrail.getWidth() <= 0) {
            throw new PluginException(PluginAPIError.TITLE_RECT);
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_PAGE)) {
            titleTrail.setPage(titleTrailMap.getInt(TrailKey.TITLE_PAGE));
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_STYLE)) {
            titleTrail.setStyle(titleTrailMap.getInt(TrailKey.TITLE_STYLE));
            if (!TITLE_STYLES.contains(titleTrail.getStyle())) {
                throw new PluginException(PluginAPIError.TITLE_ERROR_STYLE);
            }
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_NUM)) {
            titleTrail.setNum(titleTrailMap.getInt(TrailKey.TITLE_NUM));
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_INDEX)) {
            titleTrail.setIndex(titleTrailMap.getInt(TrailKey.TITLE_INDEX));
        }
        if (titleTrailMap.hasKey(TrailKey.TITLE_PAGE_SEQ)) {
            titleTrail.setPageSeq(titleTrailMap.getInt(TrailKey.TITLE_PAGE_SEQ));
        }

        // Add controlled strokes
        if (titleTrailMap.hasKey(TrailKey.CONTROL_TRAIL_NUMS)) {
            ReadableArray controlNumArray = titleTrailMap.getArray(TrailKey.CONTROL_TRAIL_NUMS);
            if (controlNumArray == null || controlNumArray.size() <= 0) {
                throw new PluginException(PluginAPIError.TITLE_CONTROL_NUM_ERROR);
            }
            List<Integer> controlTrailNums = new ArrayList<>();
            for (int i = 0; i < controlNumArray.size(); i++) {
                controlTrailNums.add(controlNumArray.getInt(i));
            }
            titleTrail.setControlTrailNums(controlTrailNums);
        }

        /*
         * if (titleTrailMap.hasKey(TrailKey.RECT_POINTS)) {
         * ReadableArray rectPointArray = titleTrailMap.getArray(TrailKey.RECT_POINTS);
         * titleTrail.setRectPoints(arrayMap2Points(rectPointArray));
         * }
         */

        return titleTrail;
    }

    public static FiveStar readableMap2FiveStar(ReadableMap fiveStarMap) throws PluginException {
        if (fiveStarMap == null) {
            return null;
        }
        FiveStar fiveStar = new FiveStar();

        // Convert points list
        if (fiveStarMap.hasKey("points")) {
            ReadableArray pointsArray = fiveStarMap.getArray("points");
            if (pointsArray == null || pointsArray.size() <= 0) {
                throw new PluginException(PluginAPIError.FIVE_STAR_NO_DATA);
            }
            List<Point> pointsList = new ArrayList<>();
            for (int i = 0; i < pointsArray.size(); i++) {
                ReadableMap pointMap = pointsArray.getMap(i);
                if (pointMap != null) {
                    int x = pointMap.hasKey("x") ? pointMap.getInt("x") : 0;
                    int y = pointMap.hasKey("y") ? pointMap.getInt("y") : 0;
                    pointsList.add(new Point(x, y));
                }
            }
            fiveStar.setPoints(pointsList);
        }
        return fiveStar;
    }

    public static Geometry readableMap2Geometry(ReadableMap geometryMap) throws PluginException {
        if (geometryMap == null) {
            return null;
        }

        Geometry geometry = new Geometry();

        // Base field conversion
        if (geometryMap.hasKey("penType")) {
            geometry.setPenType(geometryMap.getInt("penType"));
            if (!PEN_TYPES.contains(geometry.getPenType())) {
                throw new PluginException(PluginAPIError.STROKE_PEN_TYPE);
            }
        }
        if (geometryMap.hasKey("penColor")) {
            geometry.setPenColor(geometryMap.getInt("penColor"));
            if (!PEN_COLORS.contains(geometry.getPenColor())) {
                throw new PluginException(PluginAPIError.STROKE_PEN_COLOR);
            }
        }
        if (geometryMap.hasKey("penWidth")) {
            geometry.setPenWidth(geometryMap.getInt("penWidth"));
            if (geometry.getPenWidth() < 100) {
                throw new PluginException(PluginAPIError.STROKE_WIDTH);
            }
        }
        if (geometryMap.hasKey("type")) {
            geometry.setType(geometryMap.getString("type"));
            if (!GEO_TYPES.contains(geometry.getType())) {
                throw new PluginException(PluginAPIError.GEO_TYPE);
            }
        }

        // Convert points list
        if (geometryMap.hasKey("points")) {
            ReadableArray pointsArray = geometryMap.getArray("points");
            if (pointsArray != null) {
                List<Point> pointsList = new ArrayList<>();
                for (int i = 0; i < pointsArray.size(); i++) {
                    ReadableMap pointMap = pointsArray.getMap(i);
                    if (pointMap != null) {
                        int x = pointMap.hasKey("x") ? pointMap.getInt("x") : 0;
                        int y = pointMap.hasKey("y") ? pointMap.getInt("y") : 0;
                        pointsList.add(new Point(x, y));
                    }
                }
                geometry.setPoints(pointsList);
            }
        }

        if (TextUtils.equals(geometry.getType(), Geometry.TYPE_CIRCLE)
                || TextUtils.equals(geometry.getType(), Geometry.TYPE_ELLIPSE)) {

            // Convert ellipse center point
            if (geometryMap.hasKey("ellipseCenterPoint")) {
                ReadableMap centerPointMap = geometryMap.getMap("ellipseCenterPoint");
                if (centerPointMap != null) {
                    int x = centerPointMap.hasKey("x") ? centerPointMap.getInt("x") : 0;
                    int y = centerPointMap.hasKey("y") ? centerPointMap.getInt("y") : 0;
                    geometry.setEllipseCenterPoint(new Point(x, y));
                }
            }

            // Ellipse-related fields
            if (geometryMap.hasKey("ellipseMajorAxisRadius")) {
                geometry.setEllipseMajorAxisRadius(geometryMap.getInt("ellipseMajorAxisRadius"));
            }
            if (geometryMap.hasKey("ellipseMinorAxisRadius")) {
                geometry.setEllipseMinorAxisRadius(geometryMap.getInt("ellipseMinorAxisRadius"));
            }
            if (geometryMap.hasKey("ellipseAngle")) {
                geometry.setEllipseAngle(geometryMap.getDouble("ellipseAngle"));
            }
        }

        return geometry;
    }

    /*
     * public static WritableArray points2Map(List<Point> points) {
     * WritableArray pointsArray = Arguments.createArray();
     * if (points != null) {
     * for (Point point : points) {
     * WritableMap pointMap = Arguments.createMap();
     * pointMap.putInt("x", point.x);
     * pointMap.putInt("y", point.y);
     * pointsArray.pushMap(pointMap);
     * }
     * }
     * return pointsArray;
     * }
     *
     * public static List<Point> map2Points(ReadableArray pointArray) {
     * List<Point> pointsList = new ArrayList<>();
     * if (pointArray != null) {
     * for (int i = 0; i < pointArray.size(); i++) {
     * ReadableMap pointMap = pointArray.getMap(i);
     * if (pointMap != null) {
     * int x = pointMap.hasKey("x") ? pointMap.getInt("x") : 0;
     * int y = pointMap.hasKey("y") ? pointMap.getInt("y") : 0;
     * pointsList.add(new Point(x, y));
     * }
     * }
     * }
     * return pointsList;
     * }
     *
     * public static WritableArray pointFs2Map(List<PointF> points) {
     * WritableArray pointsArray = Arguments.createArray();
     * if (points != null) {
     * for (PointF point : points) {
     * WritableMap pointMap = Arguments.createMap();
     * pointMap.putDouble("x", point.x);
     * pointMap.putDouble("y", point.y);
     * pointsArray.pushMap(pointMap);
     * }
     * }
     * return pointsArray;
     * }
     *
     * public static List<PointF> map2PointFs(ReadableArray pointArray) {
     * List<PointF> pointsList = new ArrayList<>();
     * if (pointArray != null) {
     * for (int i = 0; i < pointArray.size(); i++) {
     * ReadableMap pointMap = pointArray.getMap(i);
     * if (pointMap != null) {
     * double x = pointMap.hasKey("x") ? pointMap.getDouble("x") : 0;
     * double y = pointMap.hasKey("y") ? pointMap.getDouble("y") : 0;
     * pointsList.add(new PointF((float) x, (float) y));
     * }
     * }
     * }
     * return pointsList;
     * }
     *
     * public static List<Short> map2Shorts(ReadableArray shortArray) {
     * List<Short> shortList = new ArrayList<>();
     * if(shortArray != null) {
     * for (int i = 0; i < shortArray.size(); i++) {
     * shortList.add((short) shortArray.getInt(i));
     * }
     * }
     * return shortList;
     * }
     *
     * public static WritableArray shorts2Map(List<Short> shortList) {
     * WritableArray shortArray = Arguments.createArray();
     * if(shortList != null) {
     * for (Short value: shortList) {
     * shortArray.pushInt(value);
     * }
     * }
     * return shortArray;
     * }
     *
     * public static List<Integer> map2Integers(ReadableArray shortArray) {
     * List<Integer> shortList = new ArrayList<>();
     * if(shortArray != null) {
     * for (int i = 0; i < shortArray.size(); i++) {
     * shortList.add( shortArray.getInt(i));
     * }
     * }
     * return shortList;
     * }
     *
     * public static WritableArray integers2Map(List<Integer> shortList) {
     * WritableArray shortArray = Arguments.createArray();
     * if(shortList != null) {
     * for (Integer value: shortList) {
     * shortArray.pushInt(value);
     * }
     * }
     * return shortArray;
     * }
     *
     * public static List<Boolean> map2Booleans(ReadableArray shortArray) {
     * List<Boolean> shortList = new ArrayList<>();
     * if(shortArray != null) {
     * for (int i = 0; i < shortArray.size(); i++) {
     * shortList.add( shortArray.getBoolean(i));
     * }
     * }
     * return shortList;
     * }
     *
     * public static WritableArray booleans2Map(List<Boolean> shortList) {
     * WritableArray shortArray = Arguments.createArray();
     * if(shortList != null) {
     * for (Boolean value: shortList) {
     * shortArray.pushBoolean(value);
     * }
     * }
     * return shortArray;
     * }
     */

    public static <T> WritableArray list2Map(List<T> list) {
        WritableArray array = Arguments.createArray();
        if (list != null) {
            for (T value : list) {
                if (value instanceof Boolean) {
                    array.pushBoolean((Boolean) value);
                } else if (value instanceof Integer) {
                    array.pushInt((int) value);
                } else if (value instanceof Short) {
                    array.pushInt((short) value);
                } else if (value instanceof Point) {
                    Point point = (Point) value;
                    WritableMap pointMap = Arguments.createMap();
                    pointMap.putInt("x", point.x);
                    pointMap.putInt("y", point.y);
                    array.pushMap(pointMap);
                } else if (value instanceof PointF) {
                    PointF point = (PointF) value;
                    WritableMap pointMap = Arguments.createMap();
                    pointMap.putDouble("x", point.x);
                    pointMap.putDouble("y", point.y);
                    array.pushMap(pointMap);
                } else if (value instanceof RecognData) {
                    RecognData recognData = (RecognData) value;
                    WritableMap writableMap = recognData2Map(recognData);
                    array.pushMap(writableMap);
                } else if (value instanceof List<?>) {
                    array.pushArray(list2Map((List<?>) value));

                }
            }
        }
        return array;
    }

    public static <T> List<T> map2List(ReadableArray array, Class<T> clazz) {
        List<T> list = new ArrayList<>();
        if (array != null) {
            for (int i = 0; i < array.size(); i++) {
                if (clazz == Boolean.class) {
                    list.add(clazz.cast(array.getBoolean(i)));
                } else if (clazz == Integer.class) {
                    // Fix: convert to int first, then to Integer
                    list.add(clazz.cast(array.getInt(i)));
                } else if (clazz == Short.class) {
                    // Fix: convert to short first, then to Short
                    list.add(clazz.cast((short) array.getInt(i)));
                } else if (clazz == Point.class) {
                    ReadableMap pointMap = array.getMap(i);
                    if (pointMap != null) {
                        int x = pointMap.hasKey("x") ? pointMap.getInt("x") : 0;
                        int y = pointMap.hasKey("y") ? pointMap.getInt("y") : 0;
                        list.add(clazz.cast(new Point(x, y)));
                    }
                } else if (clazz == PointF.class) {
                    ReadableMap pointMap = array.getMap(i);
                    if (pointMap != null) {
                        double x = pointMap.hasKey("x") ? pointMap.getDouble("x") : 0;
                        double y = pointMap.hasKey("y") ? pointMap.getDouble("y") : 0;
                        list.add(clazz.cast(new PointF((float) x, (float) y)));
                    }
                } else if (clazz == RecognData.class) {
                    ReadableMap readableMap = array.getMap(i);
                    if (readableMap != null) {
                        RecognData recognData = readableMap2RecognData(readableMap);
                        list.add(clazz.cast(recognData));
                    }
                }
            }
        }
        return list;
    }

    public static WritableMap rect2Map(Rect rect) {

        WritableMap writableMap = Arguments.createMap();
        writableMap.putInt("left", rect.left);
        writableMap.putInt("top", rect.top);
        writableMap.putInt("right", rect.right);
        writableMap.putInt("bottom", rect.bottom);
        return writableMap;
    }

    public static Rect map2Rect(ReadableMap rectMap) {
        int left = rectMap.hasKey("left") ? rectMap.getInt("left") : 0;
        int top = rectMap.hasKey("top") ? rectMap.getInt("top") : 0;
        int right = rectMap.hasKey("right") ? rectMap.getInt("right") : 0;
        int bottom = rectMap.hasKey("bottom") ? rectMap.getInt("bottom") : 0;

        return new Rect(left, top, right, bottom);
    }

    public static WritableMap noteStyle2Map(NoteStyle style) {
        WritableMap writableMap = Arguments.createMap();
        if (style != null) {
            writableMap.putString("name", style.name);
            writableMap.putString("md5", style.md5);
        }
        return writableMap;
    }

    public static TextLink map2TextLink(ReadableMap map) throws PluginException {
        TextLink textLink = new TextLink();
        Log.i(TAG, "map2TextLink map:" + map);
        if (map != null) {
            // Source file path
            /*
             * if (map.hasKey(TrailKey.LINK_SRC_PATH)) {
             * textLink.srcPath = map.getString(TrailKey.LINK_SRC_PATH);
             * }
             */

            // Source file page number
            /*
             * if (map.hasKey(TrailKey.LINK_SRC_PAGE)) {
             * textLink.srcPage = map.getInt(TrailKey.LINK_SRC_PAGE);
             * }
             */

            // Link style
            if (map.hasKey(TrailKey.LINK_STYLE) && !map.isNull(TrailKey.LINK_STYLE)) {
                textLink.style = map.getInt(TrailKey.LINK_STYLE);
                if (!LINK_STYLES.contains(textLink.style)) {
                    throw new PluginException(PluginAPIError.LINK_STYLE_ERROR);
                }
            }

            // Link type
            if (map.hasKey(TrailKey.LINK_LINK_TYPE) && !map.isNull(TrailKey.LINK_LINK_TYPE)) {
                textLink.linkType = map.getInt(TrailKey.LINK_LINK_TYPE);

                if (!LINK_TYPES.contains(textLink.linkType)) {
                    throw new PluginException(PluginAPIError.LINK_TYPE_ERROR);
                }
            }

            // Target file path
            if (map.hasKey(TrailKey.LINK_DEST_FILE_PATH)) {
                textLink.destPath = map.getString(TrailKey.LINK_DEST_FILE_PATH);
                int linkType = textLink.linkType;
                if (LINK_FILE_TYPES.contains(linkType)) {
                    if (!FileUtils.isFileExists(textLink.destPath)) {
                        throw new PluginException(PluginAPIError.LINK_NO_DEST_FILE);
                    }

                    if (linkType == 0 || linkType == 1) {
                        if (!FileUtils.isNote(textLink.destPath)) {
                            throw new PluginException(PluginAPIError.LINK_NO_NOTE_FILE);
                        }
                    }

                }
            }
            // Only validate page number when jumping to a note page
            // Documents also jump to a note page
            if (textLink.linkType == 0 || textLink.linkType == 2) {
                // Target file page number
                if (map.hasKey(TrailKey.LINK_DEST_PAGE_NUM)) {
                    textLink.destPage = map.getInt(TrailKey.LINK_DEST_PAGE_NUM);
                    if (textLink.linkType == 0 && textLink.destPage < 0) {
                        throw new PluginException(PluginAPIError.LINK_NO_DEST_PAGE);
                    }
                } else {
                    throw new PluginException(PluginAPIError.LINK_NO_DEST_PAGE);
                }
            }

            // Text box region
            if (map.hasKey(TrailKey.LINK_RECT)) {
                ReadableMap rectMap = map.getMap(TrailKey.LINK_RECT);
                if (rectMap != null) {
                    int left = rectMap.hasKey("left") ? rectMap.getInt("left") : 0;
                    int top = rectMap.hasKey("top") ? rectMap.getInt("top") : 0;
                    int right = rectMap.hasKey("right") ? rectMap.getInt("right") : 0;
                    int bottom = rectMap.hasKey("bottom") ? rectMap.getInt("bottom") : 0;
                    textLink.rect = new Rect(left, top, right, bottom);
                    if (textLink.rect.height() <= 0 || textLink.rect.width() <= 0
                            || Math.abs(left) > 2560 * 2 || Math.abs(top) > 2560 * 2
                            || Math.abs(right) > 2560 * 2 || Math.abs(bottom) > 2560 * 2) {
                        throw new PluginException(PluginAPIError.LINK_RECT);
                    }
                }
            }

            // Font size
            if (map.hasKey(TrailKey.LINK_FONT_SIZE)) {
                textLink.fontSize = map.getInt(TrailKey.LINK_FONT_SIZE);
            }

            // Font path
            /*
             * if (map.hasKey(TrailKey.LINK_FONT_PATH)) {
             * textLink.fontPath = map.getString(TrailKey.LINK_FONT_PATH);
             * }
             */

            // Full text content
            if (map.hasKey(TrailKey.LINK_FULL_TEXT)) {
                textLink.fullText = map.getString(TrailKey.LINK_FULL_TEXT);
                if (TextUtils.isEmpty(textLink.fullText)) {
                    throw new PluginException(PluginAPIError.LINK_TEXT_EMPTY);
                }
            }

            // Display text content
            if (map.hasKey(TrailKey.LINK_SHOW_TEXT)) {
                textLink.showText = map.getString(TrailKey.LINK_SHOW_TEXT);
                if (TextUtils.isEmpty(textLink.showText)) {
                    throw new PluginException(PluginAPIError.LINK_TEXT_EMPTY);
                }
            }

            // Anti-aliasing
            /*
             * if (map.hasKey(TrailKey.LINK_IS_ANTI)) {
             * textLink.isAnti = map.getInt(TrailKey.LINK_IS_ANTI);
             * }
             */

            // Bold
            /*
             * if (map.hasKey(TrailKey.LINK_IS_BOLD)) {
             * textLink.isBold = map.getInt(TrailKey.LINK_IS_BOLD);
             * }
             */

            // Italic
            if (map.hasKey(TrailKey.LINK_IS_ITALIC)) {
                textLink.isItalic = map.getInt(TrailKey.LINK_IS_ITALIC);
            }
        }
        return textLink;
    }

    public static ModifyLassoLink map2ModifyLink(ReadableMap map) throws PluginException {
        ModifyLassoLink modifyLassoLink = new ModifyLassoLink();
        if (map != null) {
            // Source file path
            /*
             * if (map.hasKey(TrailKey.LINK_SRC_PATH)) {
             * textLink.srcPath = map.getString(TrailKey.LINK_SRC_PATH);
             * }
             */

            // Source file page number
            /*
             * if (map.hasKey(TrailKey.LINK_SRC_PAGE)) {
             * textLink.srcPage = map.getInt(TrailKey.LINK_SRC_PAGE);
             * }
             */
            if (map.hasKey(TrailKey.LINK_CATEGORY)) {
                modifyLassoLink.category = map.getInt(TrailKey.LINK_CATEGORY);
                if (!LINK_CATEGORIES.contains(modifyLassoLink.category)) {
                    throw new PluginException(PluginAPIError.LINK_CATEGORY_ERROR);
                }
            }

            // Link style
            if (map.hasKey(TrailKey.LINK_STYLE)) {
                modifyLassoLink.style = map.getInt(TrailKey.LINK_STYLE);
                if (!LINK_STYLES.contains(modifyLassoLink.style)) {
                    throw new PluginException(PluginAPIError.LINK_STYLE_ERROR);
                }
            }

            // Link type
            if (map.hasKey(TrailKey.LINK_LINK_TYPE)) {
                modifyLassoLink.linkType = map.getInt(TrailKey.LINK_LINK_TYPE);
                if (!LINK_TYPES.contains(modifyLassoLink.linkType)) {
                    throw new PluginException(PluginAPIError.LINK_TYPE_ERROR);
                }
            }

            // Target file path
            if (map.hasKey(TrailKey.LINK_DEST_FILE_PATH)) {
                modifyLassoLink.dstPath = map.getString(TrailKey.LINK_DEST_FILE_PATH);
                int linkType = modifyLassoLink.linkType;
                if (LINK_FILE_TYPES.contains(linkType)) {
                    if (!FileUtils.isFileExists(modifyLassoLink.dstPath)) {
                        throw new PluginException(PluginAPIError.LINK_NO_DEST_FILE);
                    }

                    if (linkType == 0 || linkType == 1) {
                        if (!FileUtils.isNote(modifyLassoLink.dstPath)) {
                            throw new PluginException(PluginAPIError.LINK_NO_NOTE_FILE);
                        }
                    }

                }
            }

            // Target file page number
            if (map.hasKey(TrailKey.LINK_DEST_PAGE_NUM)) {
                modifyLassoLink.dstPage = map.getInt(TrailKey.LINK_DEST_PAGE_NUM);
                if (modifyLassoLink.linkType == 0) {
                    if (modifyLassoLink.dstPage < 0) {
                        throw new PluginException(PluginAPIError.LINK_NO_DEST_PAGE);
                    }
                }
            }

            // Font size
            if (map.hasKey(TrailKey.LINK_FONT_SIZE) && !map.isNull(TrailKey.LINK_FONT_SIZE)) {
                try {
                    modifyLassoLink.fontSize = (float) map.getDouble(TrailKey.LINK_FONT_SIZE);
                } catch (Exception ignore) {
                    modifyLassoLink.fontSize = -1;
                }
            }

            // Font path
            /*
             * if (map.hasKey(TrailKey.LINK_FONT_PATH)) {
             * // modifyLassoLink.fontPath = map.getString(TrailKey.LINK_FONT_PATH);
             * }
             */

            // if (modifyLassoLink.category == 0) {
            // Full text content
            if (map.hasKey(TrailKey.LINK_FULL_TEXT)) {
                modifyLassoLink.fullText = map.getString(TrailKey.LINK_FULL_TEXT);
                // if (TextUtils.isEmpty(modifyLassoLink.fullText)) {
                // throw new PluginException(PluginAPIError.LINK_TEXT_EMPTY);
                // }
            }

            // Display text content
            if (map.hasKey(TrailKey.LINK_SHOW_TEXT)) {
                modifyLassoLink.showText = map.getString(TrailKey.LINK_SHOW_TEXT);
                // if (TextUtils.isEmpty(modifyLassoLink.showText)) {
                // throw new PluginException(PluginAPIError.LINK_TEXT_EMPTY);
                // }
            }
            // }

            // Anti-aliasing
            /*
             * if (map.hasKey(TrailKey.LINK_IS_ANTI)) {
             * textLink.isAnti = map.getInt(TrailKey.LINK_IS_ANTI);
             * }
             */

            // Bold
            /*
             * if (map.hasKey(TrailKey.LINK_IS_BOLD)) {
             * textLink.isBold = map.getInt(TrailKey.LINK_IS_BOLD);
             * }
             */

        }
        return modifyLassoLink;
    }

    /**
     * Converts ReadableMap to SizeF
     * Expected keys: `width`, `height`. Number types supported: Double/Int.
     *
     * @param map ReadableMap containing width/height
     * @return SizeF; returns null when map is null
     */
    public static SizeF map2Size(ReadableMap map) {
        if (map == null) {
            return null;
        }

        float width = 0f;
        float height = 0f;

        if (map.hasKey("width")) {
            try {
                width = (float) map.getDouble("width");
            } catch (Exception ignore) {
                width = (float) map.getInt("width");
            }
        }

        if (map.hasKey("height")) {
            try {
                height = (float) map.getDouble("height");
            } catch (Exception ignore) {
                height = (float) map.getInt("height");
            }
        }

        return new SizeF(width, height);
    }

}
