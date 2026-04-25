export declare const transformElement: (element: Element) => void;
export declare const transformElements: (elements: Element[]) => void;
/**
 * Stroke point data type enum.
 */
export declare enum ElementPointDataType {
    /** Angle point */
    ANGLE_POINT = 0,
    /** Contour point */
    CONTOUR_POINT = 1,
    /** Stroke sample point */
    STROKE_SAMPLE_POINT = 2,
    /** Stroke pressure point */
    STROKE_PRESSURE_POINT = 3,
    /** Eraser line data */
    ERASE_LINE_DATA = 4,
    /** Write flag */
    WRITE_FLAG = 5,
    /** Marker pen direction */
    MARK_PEN_DIRECTION = 6,
    /** Recognition data point */
    RECOGNITION_DATA_POINT = 7
}
/**
 * Stroke point operation type enum.
 */
export declare enum ElementPointOperationType {
    /** Get list size */
    GET_LIST_SIZE = 0,
    /** Add point */
    ADD_POINT = 1,
    /** Get point by index */
    GET_POINT_BY_INDEX = 2,
    /** Delete point by index */
    DELETE_POINT_BY_INDEX = 3,
    /** Insert a point at index */
    INSERT_POINT_AT_INDEX = 4,
    REPLACE_POINT_AT_INDEX = 5
}
export interface Point {
    x: number;
    y: number;
}
/**
 * Generic element point-data accessor that supports Point/number/boolean/Point[]/RecognData.
 */
export declare class ElementDataAccessor<T extends Point | number | boolean | Point[] | RecognData> {
    private uuid;
    private type;
    private _size;
    private cache;
    private cacheRanges;
    private dataType;
    constructor(uuid: string, type: number, dataType: 'point' | 'number' | 'boolean' | 'pointArray' | 'recognData');
    /**
     * Gets data length.
     */
    size(): Promise<number>;
    /**
     * Gets data at the given index.
     * @param index Index.
     */
    get(index: number): Promise<T | null>;
    /**
     * Gets a range of data in batch.
     * @param startIndex Start index.
     * @param count Number of items to fetch.
     */
    getRange(startIndex: number, count: number): Promise<T[]>;
    /**
     * Iterates over all data (async iterator).
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
    /**
     * Inserts data at the given index.
     * @param index Insert position.
     * @param value Value to insert.
     */
    add(index: number, value: T): Promise<boolean>;
    /**
     * Sets a range of values in batch.
     * @param index Start index.
     * @param endIndex End index.
     * @param valueArray Values to set.
     */
    setRange(index: number, endIndex: number, valueArray: T[]): Promise<boolean>;
    /**
     * Sets data at the given index.
     * @param index Index.
     * @param value Value to set.
     */
    set(index: number, value: T): Promise<boolean>;
    /**
     * Clears cache.
     */
    clearCache(): void;
    /**
     * Gets cache stats.
     */
    getCacheStats(): {
        cachedCount: number;
        totalSize: number;
    };
    /**
     * Preloads a range of data into cache.
     * @param startIndex Start index.
     * @param count Number of items to load.
     */
    preload(startIndex: number, count: number): Promise<void>;
    /**
     * Checks whether the given index is cached.
     * @param index Index.
     */
    isCached(index: number): boolean;
    /**
     * Validates whether a value matches the expected data type.
     * @param data Value to validate.
     */
    private isValidData;
}
/**
 * Element type constants.
 * Used to identify different kinds of note elements.
 */
export declare class ElementType {
    /** Stroke type - handwritten strokes */
    static readonly TYPE_STROKE = 0;
    /** Title type */
    static readonly TYPE_TITLE = 100;
    /** Picture type - currently unused */
    static readonly TYPE_PICTURE = 200;
    /** Plain text box - backing store value: 5000000 */
    static readonly TYPE_TEXT = 500;
    /** Quote digest text box - backing store value: 5000001 */
    static readonly TYPE_TEXT_DIGEST_QUOTE = 501;
    /** Created digest text box - backing store value: 5000002 */
    static readonly TYPE_TEXT_DIGEST_CREATE = 502;
    /** Link type - when converting to backing store, equals the link style */
    static readonly TYPE_LINK = 600;
    /** Geometry type */
    static readonly TYPE_GEO = 700;
}
/**
 * Base model for note elements.
 */
export declare class Element {
    static readonly TYPE_STROKE = 0;
    static readonly TYPE_TITLE = 100;
    static readonly TYPE_PICTURE = 200;
    static readonly TYPE_TEXT = 500;
    static readonly TYPE_TEXT_DIGEST_QUOTE = 501;
    static readonly TYPE_TEXT_DIGEST_CREATE = 502;
    static readonly TYPE_LINK = 600;
    static readonly TYPE_GEO = 700;
    static readonly TYPE_FIVE_STAR = 800;
    uuid: string;
    /**
     * Element type. This may be recomputed and corresponds to m_trail_type.
     */
    type: number;
    pageNum: number;
    layerNum: number;
    thickness: number;
    recognizeResult: RecogResultData;
    maxX: number;
    maxY: number;
    /**
     * Angle data.
     * The angle data can be large, so it is stored in Android native cache. On the RN side it is accessed
     * via ElementDataAccessor; data cannot be accessed through other means.
     */
    angles: ElementDataAccessor<Point>;
    status: number;
    numInPage: number;
    /**
     * Contour points. Optional in most cases (updates may omit it), but required for titles.
     * Contour data can be large and is stored in Android native cache; access it via ElementDataAccessor.
     */
    contoursSrc: ElementDataAccessor<Point[]>;
    link: Link | null;
    title: Title | null;
    textBox: TextBox | null;
    stroke: Stroke | null;
    geometry: Geometry | null;
    fiveStar: FiveStar | null;
    picture: Picture | null;
    /**
     * Recycles this element and releases native cached data.
     */
    recycle(): Promise<void>;
    toString(): string;
}
export interface PointF {
    x: number;
    y: number;
}
export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
/**
 * Recognition result data.
 */
export declare class RecogResultData {
    predict_name: string;
    up_left_point_x: number;
    up_left_point_y: number;
    key_point_x: number;
    key_point_y: number;
    down_right_point_x: number;
    down_right_point_y: number;
}
/**
 * Link data.
 */
export declare class Link {
    static readonly CATEGORY_TEXT = 0;
    static readonly CATEGORY_TRAIL = 1;
    /**
     * Link category: 0 = text link, 1 = stroke link.
     */
    category: number;
    X: number;
    Y: number;
    width: number;
    height: number;
    page: number;
    /**
     * Link style mapping.
     * 0: solid underline
     * 1: solid border
     * 2: dashed border
     */
    style: number;
    linkType: number;
    destPath: string;
    destPage: number;
    fontSize: number;
    fullText: string;
    showText: string;
    italic: number;
    controlTrailNums: number[];
}
/**
 * Title data.
 */
export declare class Title {
    X: number;
    Y: number;
    width: number;
    height: number;
    page: number;
    num: number;
    /**
     * Title style mapping.
     * 0: remove title attribute
     * 1: black background title
     * 2: light-gray title
     * 3: dark-gray title
     * 4: shadow title
     */
    style: number;
    controlTrailNums: number[];
}
/**
 * Text box data.
 */
export declare class TextBox {
    fontSize: number;
    fontPath: string | null;
    textContentFull: string | null;
    textRect: Rect;
    textDigestData: string | null;
    textAlign: number;
    textBold: number;
    textItalics: number;
    textFrameWidthType: number;
    textFrameStyle: number;
    textEditable: number;
}
/**
 * Stroke data.
 */
export declare class Stroke {
    penColor: number;
    penType: number;
    /**
     * Sample point data.
     * Sample points can be large, so they are stored in Android native cache and accessed via ElementDataAccessor.
     */
    points: ElementDataAccessor<Point>;
    /**
     * Pressure data.
     * Pressure data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
     */
    pressures: ElementDataAccessor<number>;
    /**
     * Eraser-line data.
     * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
     */
    eraseLineTrailNums: ElementDataAccessor<number>;
    /**
     * Write-flag data.
     * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
     */
    flagDraw: ElementDataAccessor<boolean>;
    /**
     * Marker direction/pressure data. Required for marker pen rendering.
     * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
     */
    markPenDirection: ElementDataAccessor<Point>;
    /**
     * Recognition point data.
     * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
     */
    recognPoints: ElementDataAccessor<RecognData>;
    constructor(uuid: string);
    /**
     * Releases native cached data for this stroke.
     */
    recycle(): Promise<void>;
}
/**
 * Geometry data.
 */
export declare class Geometry {
    static readonly TYPE_STRAIGHT_LINE = "straightLine";
    static readonly TYPE_CIRCLE = "GEO_circle";
    static readonly TYPE_ELLIPSE = "GEO_ellipse";
    static readonly TYPE_POLYGON = "GEO_polygon";
    penColor: number;
    penType: number;
    penWidth: number;
    type: string;
    points: Point[];
    ellipseCenterPoint: Point | null;
    ellipseMajorAxisRadius: number;
    ellipseMinorAxisRadius: number;
    ellipseAngle: number;
}
export declare class FiveStar {
    points: Point[];
}
export declare class Picture {
    picturePath: string;
    rect: Rect;
}
/**
 * Recognition point data.
 */
export declare class RecognData {
    X: number;
    Y: number;
    Flag: number;
    timestamp: number;
}
//# sourceMappingURL=Element.d.ts.map