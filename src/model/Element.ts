
import NativeCommAPIModule from '../module/NativePluginAPI';

export const transformElement = (element: Element): void => {
  element.angles = new ElementDataAccessor<Point>(
    element.uuid,
    ElementPointDataType.ANGLE_POINT,
    'point'
  );

  element.contoursSrc = new ElementDataAccessor<Point[]>(
    element.uuid,
    ElementPointDataType.CONTOUR_POINT,
    'pointArray'
  );

  console.log(
    'getNotePageData set element before stroke points' +
      element?.type +
      '==' +
      element?.stroke
  );
  if (element?.type === Element.TYPE_STROKE) {
    if (!element?.stroke) {
      element.stroke = {} as Stroke;
    }
    let stroke = element?.stroke;

    stroke.points = new ElementDataAccessor<Point>(
      element.uuid,
      ElementPointDataType.STROKE_SAMPLE_POINT,
      'point'
    );

    stroke.pressures = new ElementDataAccessor<number>(
      element.uuid,
      ElementPointDataType.STROKE_PRESSURE_POINT,
      'number'
    );

    stroke.eraseLineTrailNums = new ElementDataAccessor<number>(
      element.uuid,
      ElementPointDataType.ERASE_LINE_DATA,
      'number'
    );

    stroke.flagDraw = new ElementDataAccessor<boolean>(
      element.uuid,
      ElementPointDataType.WRITE_FLAG,
      'boolean'
    );

    stroke.markPenDirection = new ElementDataAccessor<Point>(
      element.uuid,
      ElementPointDataType.MARK_PEN_DIRECTION,
      'point'
    );

    stroke.recognPoints = new ElementDataAccessor<RecognData>(
      element.uuid,
      ElementPointDataType.RECOGNITION_DATA_POINT,
      'recognData'
    );
  }
};

export const transformElements = (elements: Element[]): void => {
  for (let element of elements) {
    transformElement(element);
  }
};

/**
 * Stroke point data type enum.
 */
export enum ElementPointDataType {
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
  RECOGNITION_DATA_POINT = 7,
}

/**
 * Stroke point operation type enum.
 */
export enum ElementPointOperationType {
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
  // Replace the point at index
  REPLACE_POINT_AT_INDEX = 5,
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Generic element point-data accessor that supports Point/number/boolean/Point[]/RecognData.
 */
export class ElementDataAccessor<
  T extends Point | number | boolean | Point[] | RecognData,
> {
  private uuid: string = '';
  private type: number = -1;
  private _size: number = -1;
  private cache: Map<number, T> = new Map();
  private cacheRanges: Array<{ start: number; end: number }> = [];
  private dataType:
    | 'point'
    | 'number'
    | 'boolean'
    | 'pointArray'
    | 'recognData';

  constructor(
    uuid: string,
    type: number,
    dataType: 'point' | 'number' | 'boolean' | 'pointArray' | 'recognData'
  ) {
    console.log('ElementDataAccessor constructor uuid:', uuid);
    this.uuid = uuid;
    this.type = type;
    this.dataType = dataType;
  }

  /**
   * Gets data length.
   */
  async size(): Promise<number> {
    if (this._size === -1) {
      const result = await NativeCommAPIModule.opElementPointData(
        this.uuid,
        this.type,
        ElementPointOperationType.GET_LIST_SIZE,
        [],
        [],
        []
      );
      if (result) {
        this._size = result as number;
      }
    }
    return this._size;
  }

  /**
   * Gets data at the given index.
   * @param index Index.
   */
  async get(index: number): Promise<T | null> {
    // Check cache first
    if (this.cache.has(index)) {
      console.log('ElementDataAccessor get cache', index, this.cache.get(index));
      return this.cache.get(index)!;
    }

    // Fetch from native side
    const data = (await NativeCommAPIModule.opElementPointData(
      this.uuid,
      this.type,
      ElementPointOperationType.GET_POINT_BY_INDEX,
      [index],
      [],
      []
    )) as T[];

    console.log('ElementDataAccessor get', index, data);

    if (data?.length > 0) {
      const item = data[0];
      console.log('ElementDataAccessor get data', index, item);
      if (this.isValidData(item)) {
        this.cache.set(index, item);
        return item;
      }
    }
    return null;
  }

  /**
   * Gets a range of data in batch.
   * @param startIndex Start index.
   * @param count Number of items to fetch.
   */
  async getRange(startIndex: number, count: number): Promise<T[]> {
    // Check whether this range is already cached
    const isCached = this.cacheRanges.some(
      (range) => startIndex >= range.start && startIndex + count <= range.end
    );

    if (isCached) {
      const result: T[] = [];
      for (let i = startIndex; i < startIndex + count; i++) {
        const cachedValue = this.cache.get(i);
        if (cachedValue !== undefined) {
          result.push(cachedValue);
        }
      }
      return result;
    }

    // Batch-fetch from native side
    const data = (await NativeCommAPIModule.opElementPointData(
      this.uuid,
      this.type,
      ElementPointOperationType.GET_POINT_BY_INDEX,
      [startIndex, startIndex + count - 1],
      [],
      []
    )) as T[];

    if (data?.length > 0) {
      // Update cache
      data.forEach((item, index) => {
        if (this.isValidData(item)) {
          this.cache.set(startIndex + index, item);
        }
      });

      this.cacheRanges.push({
        start: startIndex,
        end: startIndex + count,
      });

      return data.filter((item) => this.isValidData(item));
    }
    return [];
  }

  /**
   * Iterates over all data (async iterator).
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const totalSize = await this.size();
    for (let i = 0; i < totalSize; i++) {
      const item = await this.get(i);
      if (item !== null) {
        yield item;
      }
    }
  }

  /**
   * Inserts data at the given index.
   * @param index Insert position.
   * @param value Value to insert.
   */
  async add(index: number, value: T): Promise<boolean> {
    const valueArray = [value] as unknown as Object[];

    const result = await NativeCommAPIModule.opElementPointData(
      this.uuid,
      this.type,
      ElementPointOperationType.INSERT_POINT_AT_INDEX,
      [index],
      [],
      valueArray
    );

    if (result) {
      // Clear cache because the underlying data changed
      this.clearCache();
      this._size = -1; // Reset cached size
      return true;
    }
    return false;
  }

  /**
   * Sets a range of values in batch.
   * @param index Start index.
   * @param endIndex End index.
   * @param valueArray Values to set.
   */
  async setRange(
    index: number,
    endIndex: number,
    valueArray: T[]
  ): Promise<boolean> {
    console.log('ElementDataAccessor setRange', index, endIndex);
    const newValues = valueArray as unknown as Object[];
    const result = await NativeCommAPIModule.opElementPointData(
      this.uuid,
      this.type,
      ElementPointOperationType.REPLACE_POINT_AT_INDEX,
      [index, endIndex],
      [],
      newValues
    );
    console.log('ElementDataAccessor setRange result', index, result);

    if (result) {
      // Clear cache because the underlying data changed
      this.clearCache();
      this._size = -1; // Reset cached size
      return true;
    }
    return false;
  }

  /**
   * Sets data at the given index.
   * @param index Index.
   * @param value Value to set.
   */
  async set(index: number, value: T): Promise<boolean> {
    console.log('ElementDataAccessor set', index, value);
    const valueArray = [value] as unknown as Object[];

    const result = await NativeCommAPIModule.opElementPointData(
      this.uuid,
      this.type,
      ElementPointOperationType.REPLACE_POINT_AT_INDEX,
      [index],
      [],
      valueArray
    );
    console.log('ElementDataAccessor set result', index, result);

    if (result) {
      // Clear cache because the underlying data changed
      this.clearCache();
      this._size = -1; // Reset cached size
      return true;
    }
    return false;
  }

  /**
   * Clears cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheRanges = [];
  }

  /**
   * Gets cache stats.
   */
  getCacheStats(): { cachedCount: number; totalSize: number } {
    return {
      cachedCount: this.cache.size,
      totalSize: this._size,
    };
  }

  /**
   * Preloads a range of data into cache.
   * @param startIndex Start index.
   * @param count Number of items to load.
   */
  async preload(startIndex: number, count: number): Promise<void> {
    await this.getRange(startIndex, count);
  }

  /**
   * Checks whether the given index is cached.
   * @param index Index.
   */
  isCached(index: number): boolean {
    return this.cache.has(index);
  }

  /**
   * Validates whether a value matches the expected data type.
   * @param data Value to validate.
   */
  private isValidData(data: any): data is T {
    if (this.dataType === 'number') {
      return typeof data === 'number';
    } else if (this.dataType === 'boolean') {
      return typeof data === 'boolean';
    } else if (this.dataType === 'pointArray') {
      return (
        Array.isArray(data) &&
        data.every(
          (item) =>
            item && typeof item === 'object' && 'x' in item && 'y' in item
        )
      );
    } else if (this.dataType === 'recognData') {
      return (
        data &&
        typeof data === 'object' &&
        'X' in data &&
        'Y' in data &&
        'Flag' in data &&
        'timestamp' in data &&
        typeof data.X === 'number' &&
        typeof data.Y === 'number' &&
        typeof data.Flag === 'number' &&
        typeof data.timestamp === 'number'
      );
    } else {
      return data && typeof data === 'object' && 'x' in data && 'y' in data;
    }
  }
}

// /**
//  * Convenience factory: creates a Point accessor.
//  */
// export function createTrailPointsAccessor(page: number, type: number, num: number): TrailDataAccessor<Point> {
//   return new TrailDataAccessor<Point>(page, type, num, 'point');
// }

// /**
//  * Convenience factory: creates a number accessor.
//  */
// export function createTrailNumbersAccessor(page: number, type: number, num: number): TrailDataAccessor<number> {
//   return new TrailDataAccessor<number>(page, type, num, 'number');
// }

// /**
//  * Convenience factory: creates a Point[] accessor.
//  */
// export function createTrailPointArraysAccessor(page: number, type: number, num: number): TrailDataAccessor<Point[]> {
//   return new TrailDataAccessor<Point[]>(page, type, num, 'pointArray');
// }

// /**
//  * Convenience factory: creates a RecognData accessor.
//  */
// export function createTrailRecognDataAccessor(page: number, type: number, num: number): TrailDataAccessor<RecognData> {
//   return new TrailDataAccessor<RecognData>(page, type, num, 'recognData');
// }

// // For backward compatibility, keep the original class names as type aliases.
// export type TrailPoints = TrailDataAccessor<Point>;
// export type TrailNumbers = TrailDataAccessor<number>;
// export type TrailPointArrays = TrailDataAccessor<Point[]>;
// export type TrailRecognDatas = TrailDataAccessor<RecognData>;

/**
 * Element type constants.
 * Used to identify different kinds of note elements.
 */
export class ElementType {
  /** Stroke type - handwritten strokes */
  public static readonly TYPE_STROKE = 0;

  /** Title type */
  public static readonly TYPE_TITLE = 100;

  /** Picture type - currently unused */
  public static readonly TYPE_PICTURE = 200;

  /** Plain text box - backing store value: 5000000 */
  public static readonly TYPE_TEXT = 500;

  /** Quote digest text box - backing store value: 5000001 */
  public static readonly TYPE_TEXT_DIGEST_QUOTE = 501;

  /** Created digest text box - backing store value: 5000002 */
  public static readonly TYPE_TEXT_DIGEST_CREATE = 502;

  /** Link type - when converting to backing store, equals the link style */
  public static readonly TYPE_LINK = 600;

  /** Geometry type */
  public static readonly TYPE_GEO = 700;
}

/**
 * Base model for note elements.
 */
export class Element {
  // Static constants
  public static readonly TYPE_STROKE = 0;
  public static readonly TYPE_TITLE = 100;
  public static readonly TYPE_PICTURE = 200; // Picture 
  public static readonly TYPE_TEXT = 500; // Plain text box (backing store value: 5000000)
  public static readonly TYPE_TEXT_DIGEST_QUOTE = 501; // Quote digest text box (backing store value: 5000001)
  public static readonly TYPE_TEXT_DIGEST_CREATE = 502; // Created digest text box (backing store value: 5000002)
  public static readonly TYPE_LINK = 600; // When converting to backing store, equals the link style
  public static readonly TYPE_GEO = 700; // Geometry
  public static readonly TYPE_FIVE_STAR = 800; // Five-pointed star

  public uuid: string; // Universally unique identifier

  /**
   * Element type. This may be recomputed and corresponds to m_trail_type.
   */
  public type: number = 0;
  // public preNum: number = 5000;
  public pageNum: number = 0; // Page number
  public layerNum: number = 0; // Layer number
  public thickness: number = 0; // Stroke thickness
  // public trailNum: number = 0; // Stroke ID (may be unnecessary and of limited use)
  // Recognition result
  public recognizeResult: RecogResultData = new RecogResultData();
  public maxX: number = 0; // Max coordinate value
  public maxY: number = 0; // Max coordinate value
  /**
   * Angle data.
   * The angle data can be large, so it is stored in Android native cache. On the RN side it is accessed
   * via ElementDataAccessor; data cannot be accessed through other means.
   */
  public angles: ElementDataAccessor<Point> = new ElementDataAccessor<Point>(
    '',
    ElementPointDataType.ANGLE_POINT,
    'point'
  ); //
  public status: number = 0; // Stroke status
  public numInPage: number = 0; // Index within the page (unique within the page, starts at 0)
  /**
   * Contour points. Optional in most cases (updates may omit it), but required for titles.
   * Contour data can be large and is stored in Android native cache; access it via ElementDataAccessor.
   */
  public contoursSrc: ElementDataAccessor<Point[]> = new ElementDataAccessor<
    Point[]
  >('', ElementPointDataType.CONTOUR_POINT, 'pointArray');
  // public factorResize: number = 1.0; // Zoom scale
  // public filterFlag: boolean = false; // Filter flag (optional)
  // public redrawWidth: number = 0; // Redraw width/height
  // public redrawHeight: number = 0; // Redraw height/width
  // public emrPointAxis: number = 1; // EMR coordinate axis for sample points: 0=top-left, 1=top-right (default), 2=bottom-right, 3=bottom-left
  public link: Link | null = null; // Link data; present only for link elements
  public title: Title | null = null; // Title data; present only for title elements
  public textBox: TextBox | null = null; // Text box data; present only for text elements
  public stroke: Stroke | null = null; // Stroke data; present only for stroke elements
  public geometry: Geometry | null = null; // Geometry data; present only for geometry elements

  public fiveStar: FiveStar | null = null; // Five-star data; present only for five-star elements

  public picture: Picture | null = null; // Picture data; present only for picture elements
  /**
   * Recycles this element and releases native cached data.
   */
  public async recycle(): Promise<void> {
    NativeCommAPIModule.recycleElement(this.uuid);
    this.angles?.clearCache();
    this.contoursSrc?.clearCache();
  }
  public toString(): string {
    return (
      `Trail{` +
      `type=${this.type}, ` +
      // `preNum=${this.preNum}, ` +
      `pageNum=${this.pageNum}, ` +
      `layerNum=${this.layerNum}, ` +
      `thickness=${this.thickness}, ` +
      // `trailNum=${this.trailNum}, ` +
      `recognizeResult=${this.recognizeResult}, ` +
      `maxX=${this.maxX}, ` +
      `maxY=${this.maxY}, ` +
      `angles=${JSON.stringify(this.angles)}, ` +
      `status=${this.status}, ` +
      `numInPage=${this.numInPage}, ` +
      `contoursSrc=${JSON.stringify(this.contoursSrc)}, ` +
      // `factorResize=${this.factorResize}, ` +
      // `filterFlag=${this.filterFlag}, ` +
      `link=${this.link}, ` +
      `title=${this.title}, ` +
      `textBox=${this.textBox}, ` +
      `stroke=${this.stroke}, ` +
      `geometry=${this.geometry}` +
      `}`
    );
  }
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
export class RecogResultData {
  public predict_name: string = 'others';

  // Upper-left corner
  public up_left_point_x: number = 0;
  public up_left_point_y: number = 0;
  // Key point
  public key_point_x: number = 0;
  public key_point_y: number = 0;

  // Lower-right corner
  public down_right_point_x: number = 0;
  public down_right_point_y: number = 0;
}

/**
 * Link data.
 */
export class Link {
  // Text link
  public static readonly CATEGORY_TEXT = 0;
  // Stroke link
  public static readonly CATEGORY_TRAIL = 1;

  /**
   * Link category: 0 = text link, 1 = stroke link.
   */
  public category: number = 0;
  public X: number = 0; // Top-left X in page coordinates
  public Y: number = 0; // Top-left Y in page coordinates
  public width: number = 0; // Link width
  public height: number = 0; // Link height
  public page: number = 0; // Current page number
  // public num: number = 0; // Index within the page
  // public index: number = 0; // Export: global link index
  /**
   * Link style mapping.
   * 0: solid underline
   * 1: solid border
   * 2: dashed border
   */
  public style: number = 0;
  /// Link type (must match the native mapping).
  /// 0: jump to note page
  /// 1: note file
  /// 2: document
  /// 3: image
  /// 4: URL
  /// 5: other
  /// 6: digest link (jumps to digest)
  public linkType: number = 0;
  public destPath: string = ''; // Target path. For URL links, this is the URL.
  // public destFileId: string = ""; // Outbound: target file ID; inbound: source file ID
  // public destPageId: string = ""; // Outbound: target page ID; inbound: source page ID
  public destPage: number = 0; // Target page number (only valid when linkType = 0)

  // Text-link-only fields
  public fontSize: number = 0; // Font size
  // public fontPath: string = ""; // Font path
  public fullText: string = ''; // Full text content
  public showText: string = ''; // Display text
  // Font rendering style
  // public anti: number = 1;
  // public bold: number = 1;
  public italic: number = 1;
  // public newDestPageNum: number = 1;// Page after re-resolving
  // Stroke ID list. For stroke links, indicates which strokes belong to this link.
  public controlTrailNums: number[] = [];
  // Link region points (top-right and bottom-left) in Android screen coordinates.
  // Stroke links do not need to provide this; it can be computed from controlTrailNums. Text links should provide it.
  // public rectPoints: Point[] = [];
}

/**
 * Title data.
 */
export class Title {
  public X: number = 0; // Top-left X in page coordinates
  public Y: number = 0; // Top-left Y in page coordinates
  public width: number = 0; // Title width
  public height: number = 0; // Title height
  public page: number = 0; // Current page number
  public num: number = 0; // Index within the page
  /**
   * Title style mapping.
   * 0: remove title attribute
   * 1: black background title
   * 2: light-gray title
   * 3: dark-gray title
   * 4: shadow title
   */
  public style: number = 0;
  // Stroke ID list. For stroke titles, indicates which strokes belong to this title.
  public controlTrailNums: number[] = [];
}

/**
 * Text box data.
 */
export class TextBox {
  public fontSize: number = 0.0; // Font size
  public fontPath: string | null = null; // Font path
  public textContentFull: string | null = null; // Full text content
  public textRect: Rect = { left: 0, top: 0, right: 0, bottom: 0 }; // Text box rectangle
  // public textLineHeight: number = 0.0; // Line height
  public textDigestData: string | null = null; // Digest data
  // public textType: number = 0; // 0: plain text 1: markdown 2: custom format (not rendered by the note engine; stores text + position + related image)
  // public textColor: number = 0; // textPaint.setColor(Color.BLACK); sets text color.
  // public textTypeface: number = 0; // textPaint.setTypeface(Typeface.SERIF); sets typeface (regular/bold/italic, etc.).
  // public letterSpacing: number = 0.0; // textPaint.setLetterSpacing(0.1f); sets character spacing.
  // public lineSpacingExtra: number = 0.0; // Extra line spacing
  // public lineSpacingMultiplier: number = 0.0; // Line-height multiplier. textPaint.setLineSpacing(1.5f, 1.2f); sets extra spacing and multiplier.
  public textAlign: number = 0; // textPaint.setTextAlign(Paint.Align.CENTER); alignment: 0=left, 1=center, 2=right.
  // public textAntiAlias: number = 0; // textPaint.setAntiAlias(true); enables/disables anti-aliasing for smoother text.
  public textBold: number = 0; // Typeface bold: 0=normal, 1=bold
  // public textShadowLayer: number = 0; // textPaint.setShadowLayer(10, 5, 5, Color.GRAY); sets shadow effect.
  // public textVertical: number = 0; // textPaint.setTextVertical(true); enables vertical text layout (commonly used in some languages).
  public textItalics: number = 0; // Typeface italic: 0=normal, 1=italic
  public textFrameWidthType: number = 0; // 0: fixed width 1: auto width
  // Border rendering mode: 0=no border, 3=stroke
  // Optional. For digest text boxes this is 3; others are 0. Currently not editable; can be omitted on insert/update.
  public textFrameStyle: number = 0;
  // public textFrameStrokeColor: number = 0; // Border color
  // public textFrameFillColor: number = 255; // Fill color
  // Editable state: 0=editable, 1=not editable. Optional. Digest text boxes use 1; others use 0.
  // Currently not editable; can be omitted on insert/update.
  public textEditable: number = 0;
  // public textLayer: number = 0; // Layer the text box belongs to
}

/**
 * Stroke data.
 */
export class Stroke {
  public penColor: number = 0; // Pen color: 0xFE=white, 0x9D=dark gray, 0xC9=light gray
  public penType: number = 0; // Pen type: 10=fineliner, 1=pressure pen, 11=marker
  /**
   * Sample point data.
   * Sample points can be large, so they are stored in Android native cache and accessed via ElementDataAccessor.
   */
  public points: ElementDataAccessor<Point> /* = new ElementDataAccessor<Point>("",
    ElementPointDataType.STROKE_SAMPLE_POINT,
    'point') */;
  /**
   * Pressure data.
   * Pressure data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */
  public pressures: ElementDataAccessor<number> /* = new ElementDataAccessor<number>("",
    ElementPointDataType.STROKE_PRESSURE_POINT,
    'number') */;
  /**
   * Eraser-line data.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */
  public eraseLineTrailNums: ElementDataAccessor<number> /* = new ElementDataAccessor<number>("",
    ElementPointDataType.ERASE_LINE_DATA,
    'number') */; // Eraser-line data (optional; can be omitted when inserting a stroke)
  /**
   * Write-flag data.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */
  public flagDraw: ElementDataAccessor<boolean> /* = new ElementDataAccessor<boolean>("",
    ElementPointDataType.WRITE_FLAG,
    'boolean') */;
  /**
   * Marker direction/pressure data. Required for marker pen rendering.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */
  public markPenDirection: ElementDataAccessor<Point> /* = new ElementDataAccessor<Point>("",
    ElementPointDataType.MARK_PEN_DIRECTION,
    'point') */;
  /**
   * Recognition point data.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */
  public recognPoints: ElementDataAccessor<RecognData> /* = new ElementDataAccessor<RecognData>("",
    ElementPointDataType.RECOGNITION_DATA_POINT,
    'recognData') */;

  constructor(uuid: string) {
    console.log('Stroke constructor uuid:', uuid);
    this.points = new ElementDataAccessor<Point>(
      uuid,
      ElementPointDataType.STROKE_SAMPLE_POINT,
      'point'
    );

    this.pressures = new ElementDataAccessor<number>(
      uuid,
      ElementPointDataType.STROKE_PRESSURE_POINT,
      'number'
    );

    this.eraseLineTrailNums = new ElementDataAccessor<number>(
      uuid,
      ElementPointDataType.ERASE_LINE_DATA,
      'number'
    );

    this.flagDraw = new ElementDataAccessor<boolean>(
      uuid,
      ElementPointDataType.WRITE_FLAG,
      'boolean'
    );

    this.markPenDirection = new ElementDataAccessor<Point>(
      uuid,
      ElementPointDataType.MARK_PEN_DIRECTION,
      'point'
    );

    this.recognPoints = new ElementDataAccessor<RecognData>(
      uuid,
      ElementPointDataType.RECOGNITION_DATA_POINT,
      'recognData'
    );
  }

  /**
   * Releases native cached data for this stroke.
   */
  public async recycle(): Promise<void> {
    this.points?.clearCache();
    this.pressures?.clearCache();
    this.eraseLineTrailNums?.clearCache();
    this.flagDraw?.clearCache();
    this.markPenDirection?.clearCache();
    this.recognPoints?.clearCache();
  }
}

/**
 * Geometry data.
 */
export class Geometry {
  public static readonly TYPE_STRAIGHT_LINE = 'straightLine';
  public static readonly TYPE_CIRCLE = 'GEO_circle';
  public static readonly TYPE_ELLIPSE = 'GEO_ellipse';
  public static readonly TYPE_POLYGON = 'GEO_polygon';

  public penColor: number = 0; // Pen color: 0xFE=white, 0x9D=dark gray, 0xC9=light gray
  public penType: number = 0; // Pen type: 10=fineliner, 1=pressure pen, 11=marker
  public penWidth: number = 0; // Pen width
  public type: string = ''; // straightLine | GEO_circle | GEO_ellipse | GEO_polygon
  public points: Point[] = []; // Polygon points in Android screen coordinates (relative to top-left; not EMR)
  public ellipseCenterPoint: Point | null = null; // Ellipse center
  public ellipseMajorAxisRadius: number = 0; // Major axis radius
  public ellipseMinorAxisRadius: number = 0; // Minor axis radius
  public ellipseAngle: number = 0; // Rotation angle
}

export class FiveStar {
  public points: Point[] = []; // Five-star points in EMR coordinates
}

export class Picture {
  public picturePath: string = ''; // Path to the image file
  public rect: Rect = { left: 0, top: 0, right: 0, bottom: 0 }; // Image rectangle in EMR coordinates
}

/**
 * Recognition point data.
 */
export class RecognData {
  public X: number = 0;
  public Y: number = 0;
  public Flag: number = 0;
  public timestamp: number = -1;
}
