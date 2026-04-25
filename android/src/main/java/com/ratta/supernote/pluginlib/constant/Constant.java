package com.ratta.supernote.pluginlib.constant;

import com.ratta.supernote.plugincommon.data.common.trail.Geometry;
import com.ratta.supernote.plugincommon.data.common.trail.LinkTrail;
import com.ratta.supernote.plugincommon.data.common.trail.Trail;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Constant {
    public static String RUN_IMPL_FILE = "DexDependencies.json";
    public static String dexDependencies = "dexDependencies";
    public static String DEX_PATH = "dexPath";
    public static String SO_DIR_PATH = "soDirPath";

    public static String PARENT_DEX = "parentDex";

    public static final List<Integer> TRAIL_TYPES = new ArrayList<>(
        Arrays.asList(Trail.TRAIL_TYPE_STROKE,
            Trail.TRAIL_TYPE_TILE,
            Trail.TRAIL_TYPE_PICTURE,
            Trail.TRAIL_TYPE_TEXT,
            Trail.TRAIL_TYPE_TEXT_DIGEST_CREATE,
            Trail.TRAIL_TYPE_TEXT_DIGEST_QUOTE,
            Trail.TRAIL_TYPE_LINK,
            Trail.TRAIL_TYPE_GEO,
            Trail.TRAIL_TYPE_FIVE_STAR)
    );

    public static final List<Integer> MAIN_LAYER_TRAIL_TYPES = new ArrayList<>(
        Arrays.asList(Trail.TRAIL_TYPE_STROKE,
            Trail.TRAIL_TYPE_GEO,
            Trail.TRAIL_TYPE_FIVE_STAR,
            Trail.TRAIL_TYPE_TEXT)
    );

    public static final List<Integer> PEN_COLORS = new ArrayList<>(
        Arrays.asList(
            0xFE,
            0x9D,
            0x9E,
            0xC9,
            202,
            0,
            255

        )
    );
    public static final List<Integer> PEN_TYPES = new ArrayList<>(
        Arrays.asList(
            10,
            1,
            11

        )
    );

    public static final List<Integer> LINK_CATEGORIES = new ArrayList<>(
        Arrays.asList(
            LinkTrail.CATEGORY_TRAIL,
            LinkTrail.CATEGORY_TEXT
        )
    );


    public static final List<Integer> LINK_STYLES = new ArrayList<>(
        Arrays.asList(
            0,
            1,
            2
        )
    );

    public static final List<Integer> LINK_TYPES = new ArrayList<>(
        Arrays.asList(
            0,
            1,
            2,
            3,
            4
        )
    );

    /**
     * File link types.
     */
    public static final List<Integer> LINK_FILE_TYPES = new ArrayList<>(
        Arrays.asList(
            0,
            1,
            2,
            3

        )
    );


    public static final List<Integer> TITLE_STYLES = new ArrayList<>(
        Arrays.asList(
            0,
            1,
            2,
            3,
            4
        )
    );

    public static final List<String> GEO_TYPES = new ArrayList<>(
        Arrays.asList(
            Geometry.TYPE_STRAIGHT_LINE,
            Geometry.TYPE_CIRCLE,
            Geometry.TYPE_ELLIPSE,
            Geometry.TYPE_POLYGON
        )
    );



}
