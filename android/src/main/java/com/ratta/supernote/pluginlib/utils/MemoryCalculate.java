package com.ratta.supernote.pluginlib.utils;

import android.graphics.PointF;

import com.ratta.supernote.plugincommon.data.common.trail.Geometry;
import com.ratta.supernote.plugincommon.data.common.trail.LinkTrail;
import com.ratta.supernote.plugincommon.data.common.trail.Stroke;
import com.ratta.supernote.plugincommon.data.common.trail.TextBox;
import com.ratta.supernote.plugincommon.data.common.trail.TitleTrail;
import com.ratta.supernote.plugincommon.data.common.trail.Trail;

import java.util.List;

/**
 * Memory usage calculation utilities.
 */
public class MemoryCalculate {

    /**
     * Calculates the approximate memory usage of a Trail object.
     * Primarily accounts for the memory used by list fields inside Trail.
     * 
     * @param trail Trail object
     * @return Memory usage in bytes
     */
    public static long calculateTrailMemorySize(Trail trail) {
        if (trail == null) {
            return 0;
        }

        long totalSize = 0;

        // 1. Base field overhead (approx. 100 bytes)
        totalSize += 100;

        // 2. UUID string

        // 3. angles List<Point>
        if (trail.getAngles() != null) {
            totalSize += trail.getAngles().size() * 8; // Point approx. 8 bytes (2 ints)
        }

        // 4. contoursSrc List<List<PointF>>
        if (trail.getContoursSrc() != null) {
            for (List<PointF> contour : trail.getContoursSrc()) {
                if (contour != null) {
                    totalSize += contour.size() * 8; // PointF approx. 8 bytes (2 floats)
                }
            }
        }

        // 5. Lists in LinkTrail
        if (trail.getLink() != null) {
            LinkTrail link = trail.getLink();
            // controlTrailNums List<Integer>
            if (link.getControlTrailNums() != null) {
                totalSize += link.getControlTrailNums().size() * 4; // Integer: 4 bytes
            }
            // rectPoints List<Point>
            /*
             * if (link.getRectPoints() != null) {
             * totalSize += link.getRectPoints().size() * 8; // Point: 8 bytes
             * }
             */

        }

        // 6. Lists in TitleTrail
        if (trail.getTitle() != null) {
            TitleTrail title = trail.getTitle();
            // controlTrailNums List<Integer>
            if (title.getControlTrailNums() != null) {
                totalSize += title.getControlTrailNums().size() * 4;
            }
            // rectPoints List<Point>
            /*
             * if (title.getRectPoints() != null) {
             * totalSize += title.getRectPoints().size() * 8;
             * }
             */
        }

        // 7. Strings in TextBox
        if (trail.getTextBox() != null) {
            TextBox textBox = trail.getTextBox();
            totalSize += calculateStringSize(textBox.getFontPath());
            totalSize += calculateStringSize(textBox.getTextContentFull());
            totalSize += calculateStringSize(textBox.getTextDigestData());
            totalSize += 50; // Other base fields
        }

        // 8. Lists in Stroke (usually the largest memory consumer)
        if (trail.getStroke() != null) {
            Stroke stroke = trail.getStroke();
            // points List<Point>
            if (stroke.getPoints() != null) {
                totalSize += stroke.getPoints().size() * 8;
            }
            // pressures List<Short>
            if (stroke.getPressures() != null) {
                totalSize += stroke.getPressures().size() * 2; // Short: 2 bytes
            }
            // eraseLineTrailNums List<Integer>
            if (stroke.getEraseLineTrailNums() != null) {
                totalSize += stroke.getEraseLineTrailNums().size() * 4;
            }
            // flagDraw List<Boolean>
            if (stroke.getFlagDraw() != null) {
                totalSize += stroke.getFlagDraw().size() * 1; // Boolean: 1 byte
            }
            // markPenDirection List<PointF>
            if (stroke.getMarkPenDirection() != null) {
                totalSize += stroke.getMarkPenDirection().size() * 8;
            }
            // recognPoints List<RecognData>
            if (stroke.getRecognPoints() != null) {
                totalSize += stroke.getRecognPoints().size() * 50; // RecognData approx. 50 bytes
            }
        }

        // 9. Lists in Geometry
        if (trail.getGeometry() != null) {
            Geometry geometry = trail.getGeometry();
            // points List<Point>
            if (geometry.getPoints() != null) {
                totalSize += geometry.getPoints().size() * 8;
            }
            totalSize += calculateStringSize(geometry.getType());
            totalSize += 20; // Other base fields
        }

        // 10. RecogResultData
        if (trail.getRecognizeResult() != null) {
            totalSize += calculateStringSize(trail.getRecognizeResult().get_predict_name());
            totalSize += 24; // 6 int fields
        }

        return totalSize;
    }

    /**
     * Estimates the memory usage of a string.
     * 
     * @param str String
     * @return Bytes
     */
    public static long calculateStringSize(String str) {
        if (str == null) {
            return 0;
        }
        return str.length() * 2; // UTF-16 encoding
    }

}
