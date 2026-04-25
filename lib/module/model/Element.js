"use strict";

import NativeCommAPIModule from '../module/NativePluginAPI';
export const transformElement = element => {
  element.angles = new ElementDataAccessor(element.uuid, ElementPointDataType.ANGLE_POINT, 'point');
  element.contoursSrc = new ElementDataAccessor(element.uuid, ElementPointDataType.CONTOUR_POINT, 'pointArray');
  console.log('getNotePageData set element before stroke points' + element?.type + '==' + element?.stroke);
  if (element?.type === Element.TYPE_STROKE) {
    if (!element?.stroke) {
      element.stroke = {};
    }
    let stroke = element?.stroke;
    stroke.points = new ElementDataAccessor(element.uuid, ElementPointDataType.STROKE_SAMPLE_POINT, 'point');
    stroke.pressures = new ElementDataAccessor(element.uuid, ElementPointDataType.STROKE_PRESSURE_POINT, 'number');
    stroke.eraseLineTrailNums = new ElementDataAccessor(element.uuid, ElementPointDataType.ERASE_LINE_DATA, 'number');
    stroke.flagDraw = new ElementDataAccessor(element.uuid, ElementPointDataType.WRITE_FLAG, 'boolean');
    stroke.markPenDirection = new ElementDataAccessor(element.uuid, ElementPointDataType.MARK_PEN_DIRECTION, 'point');
    stroke.recognPoints = new ElementDataAccessor(element.uuid, ElementPointDataType.RECOGNITION_DATA_POINT, 'recognData');
  }
};
export const transformElements = elements => {
  for (let element of elements) {
    transformElement(element);
  }
};

/**
 * Stroke point data type enum.
 */
export let ElementPointDataType = /*#__PURE__*/function (ElementPointDataType) {
  /** Angle point */
  ElementPointDataType[ElementPointDataType["ANGLE_POINT"] = 0] = "ANGLE_POINT";
  /** Contour point */
  ElementPointDataType[ElementPointDataType["CONTOUR_POINT"] = 1] = "CONTOUR_POINT";
  /** Stroke sample point */
  ElementPointDataType[ElementPointDataType["STROKE_SAMPLE_POINT"] = 2] = "STROKE_SAMPLE_POINT";
  /** Stroke pressure point */
  ElementPointDataType[ElementPointDataType["STROKE_PRESSURE_POINT"] = 3] = "STROKE_PRESSURE_POINT";
  /** Eraser line data */
  ElementPointDataType[ElementPointDataType["ERASE_LINE_DATA"] = 4] = "ERASE_LINE_DATA";
  /** Write flag */
  ElementPointDataType[ElementPointDataType["WRITE_FLAG"] = 5] = "WRITE_FLAG";
  /** Marker pen direction */
  ElementPointDataType[ElementPointDataType["MARK_PEN_DIRECTION"] = 6] = "MARK_PEN_DIRECTION";
  /** Recognition data point */
  ElementPointDataType[ElementPointDataType["RECOGNITION_DATA_POINT"] = 7] = "RECOGNITION_DATA_POINT";
  return ElementPointDataType;
}({});

/**
 * Stroke point operation type enum.
 */
export let ElementPointOperationType = /*#__PURE__*/function (ElementPointOperationType) {
  /** Get list size */
  ElementPointOperationType[ElementPointOperationType["GET_LIST_SIZE"] = 0] = "GET_LIST_SIZE";
  /** Add point */
  ElementPointOperationType[ElementPointOperationType["ADD_POINT"] = 1] = "ADD_POINT";
  /** Get point by index */
  ElementPointOperationType[ElementPointOperationType["GET_POINT_BY_INDEX"] = 2] = "GET_POINT_BY_INDEX";
  /** Delete point by index */
  ElementPointOperationType[ElementPointOperationType["DELETE_POINT_BY_INDEX"] = 3] = "DELETE_POINT_BY_INDEX";
  /** Insert a point at index */
  ElementPointOperationType[ElementPointOperationType["INSERT_POINT_AT_INDEX"] = 4] = "INSERT_POINT_AT_INDEX";
  // Replace the point at index
  ElementPointOperationType[ElementPointOperationType["REPLACE_POINT_AT_INDEX"] = 5] = "REPLACE_POINT_AT_INDEX";
  return ElementPointOperationType;
}({});
/**
 * Generic element point-data accessor that supports Point/number/boolean/Point[]/RecognData.
 */
export class ElementDataAccessor {
  uuid = '';
  type = -1;
  _size = -1;
  cache = new Map();
  cacheRanges = [];
  constructor(uuid, type, dataType) {
    console.log('ElementDataAccessor constructor uuid:', uuid);
    this.uuid = uuid;
    this.type = type;
    this.dataType = dataType;
  }

  /**
   * Gets data length.
   */
  async size() {
    if (this._size === -1) {
      const result = await NativeCommAPIModule.opElementPointData(this.uuid, this.type, ElementPointOperationType.GET_LIST_SIZE, [], [], []);
      if (result) {
        this._size = result;
      }
    }
    return this._size;
  }

  /**
   * Gets data at the given index.
   * @param index Index.
   */
  async get(index) {
    // Check cache first
    if (this.cache.has(index)) {
      console.log('ElementDataAccessor get cache', index, this.cache.get(index));
      return this.cache.get(index);
    }

    // Fetch from native side
    const data = await NativeCommAPIModule.opElementPointData(this.uuid, this.type, ElementPointOperationType.GET_POINT_BY_INDEX, [index], [], []);
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
  async getRange(startIndex, count) {
    // Check whether this range is already cached
    const isCached = this.cacheRanges.some(range => startIndex >= range.start && startIndex + count <= range.end);
    if (isCached) {
      const result = [];
      for (let i = startIndex; i < startIndex + count; i++) {
        const cachedValue = this.cache.get(i);
        if (cachedValue !== undefined) {
          result.push(cachedValue);
        }
      }
      return result;
    }

    // Batch-fetch from native side
    const data = await NativeCommAPIModule.opElementPointData(this.uuid, this.type, ElementPointOperationType.GET_POINT_BY_INDEX, [startIndex, startIndex + count - 1], [], []);
    if (data?.length > 0) {
      // Update cache
      data.forEach((item, index) => {
        if (this.isValidData(item)) {
          this.cache.set(startIndex + index, item);
        }
      });
      this.cacheRanges.push({
        start: startIndex,
        end: startIndex + count
      });
      return data.filter(item => this.isValidData(item));
    }
    return [];
  }

  /**
   * Iterates over all data (async iterator).
   */
  async *[Symbol.asyncIterator]() {
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
  async add(index, value) {
    const valueArray = [value];
    const result = await NativeCommAPIModule.opElementPointData(this.uuid, this.type, ElementPointOperationType.INSERT_POINT_AT_INDEX, [index], [], valueArray);
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
  async setRange(index, endIndex, valueArray) {
    console.log('ElementDataAccessor setRange', index, endIndex);
    const newValues = valueArray;
    const result = await NativeCommAPIModule.opElementPointData(this.uuid, this.type, ElementPointOperationType.REPLACE_POINT_AT_INDEX, [index, endIndex], [], newValues);
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
  async set(index, value) {
    console.log('ElementDataAccessor set', index, value);
    const valueArray = [value];
    const result = await NativeCommAPIModule.opElementPointData(this.uuid, this.type, ElementPointOperationType.REPLACE_POINT_AT_INDEX, [index], [], valueArray);
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
  clearCache() {
    this.cache.clear();
    this.cacheRanges = [];
  }

  /**
   * Gets cache stats.
   */
  getCacheStats() {
    return {
      cachedCount: this.cache.size,
      totalSize: this._size
    };
  }

  /**
   * Preloads a range of data into cache.
   * @param startIndex Start index.
   * @param count Number of items to load.
   */
  async preload(startIndex, count) {
    await this.getRange(startIndex, count);
  }

  /**
   * Checks whether the given index is cached.
   * @param index Index.
   */
  isCached(index) {
    return this.cache.has(index);
  }

  /**
   * Validates whether a value matches the expected data type.
   * @param data Value to validate.
   */
  isValidData(data) {
    if (this.dataType === 'number') {
      return typeof data === 'number';
    } else if (this.dataType === 'boolean') {
      return typeof data === 'boolean';
    } else if (this.dataType === 'pointArray') {
      return Array.isArray(data) && data.every(item => item && typeof item === 'object' && 'x' in item && 'y' in item);
    } else if (this.dataType === 'recognData') {
      return data && typeof data === 'object' && 'X' in data && 'Y' in data && 'Flag' in data && 'timestamp' in data && typeof data.X === 'number' && typeof data.Y === 'number' && typeof data.Flag === 'number' && typeof data.timestamp === 'number';
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
  static TYPE_STROKE = 0;

  /** Title type */
  static TYPE_TITLE = 100;

  /** Picture type - currently unused */
  static TYPE_PICTURE = 200;

  /** Plain text box - backing store value: 5000000 */
  static TYPE_TEXT = 500;

  /** Quote digest text box - backing store value: 5000001 */
  static TYPE_TEXT_DIGEST_QUOTE = 501;

  /** Created digest text box - backing store value: 5000002 */
  static TYPE_TEXT_DIGEST_CREATE = 502;

  /** Link type - when converting to backing store, equals the link style */
  static TYPE_LINK = 600;

  /** Geometry type */
  static TYPE_GEO = 700;
}

/**
 * Base model for note elements.
 */
export class Element {
  // Static constants
  static TYPE_STROKE = 0;
  static TYPE_TITLE = 100;
  static TYPE_PICTURE = 200; // Picture 
  static TYPE_TEXT = 500; // Plain text box (backing store value: 5000000)
  static TYPE_TEXT_DIGEST_QUOTE = 501; // Quote digest text box (backing store value: 5000001)
  static TYPE_TEXT_DIGEST_CREATE = 502; // Created digest text box (backing store value: 5000002)
  static TYPE_LINK = 600; // When converting to backing store, equals the link style
  static TYPE_GEO = 700; // Geometry
  static TYPE_FIVE_STAR = 800; // Five-pointed star

  // Universally unique identifier

  /**
   * Element type. This may be recomputed and corresponds to m_trail_type.
   */
  type = 0;
  // public preNum: number = 5000;
  pageNum = 0; // Page number
  layerNum = 0; // Layer number
  thickness = 0; // Stroke thickness
  // public trailNum: number = 0; // Stroke ID (may be unnecessary and of limited use)
  // Recognition result
  recognizeResult = new RecogResultData();
  maxX = 0; // Max coordinate value
  maxY = 0; // Max coordinate value
  /**
   * Angle data.
   * The angle data can be large, so it is stored in Android native cache. On the RN side it is accessed
   * via ElementDataAccessor; data cannot be accessed through other means.
   */
  angles = new ElementDataAccessor('', ElementPointDataType.ANGLE_POINT, 'point'); //
  status = 0; // Stroke status
  numInPage = 0; // Index within the page (unique within the page, starts at 0)
  /**
   * Contour points. Optional in most cases (updates may omit it), but required for titles.
   * Contour data can be large and is stored in Android native cache; access it via ElementDataAccessor.
   */
  contoursSrc = new ElementDataAccessor('', ElementPointDataType.CONTOUR_POINT, 'pointArray');
  // public factorResize: number = 1.0; // Zoom scale
  // public filterFlag: boolean = false; // Filter flag (optional)
  // public redrawWidth: number = 0; // Redraw width/height
  // public redrawHeight: number = 0; // Redraw height/width
  // public emrPointAxis: number = 1; // EMR coordinate axis for sample points: 0=top-left, 1=top-right (default), 2=bottom-right, 3=bottom-left
  link = null; // Link data; present only for link elements
  title = null; // Title data; present only for title elements
  textBox = null; // Text box data; present only for text elements
  stroke = null; // Stroke data; present only for stroke elements
  geometry = null; // Geometry data; present only for geometry elements

  fiveStar = null; // Five-star data; present only for five-star elements

  picture = null; // Picture data; present only for picture elements
  /**
   * Recycles this element and releases native cached data.
   */
  async recycle() {
    NativeCommAPIModule.recycleElement(this.uuid);
    this.angles?.clearCache();
    this.contoursSrc?.clearCache();
  }
  toString() {
    return `Trail{` + `type=${this.type}, ` +
    // `preNum=${this.preNum}, ` +
    `pageNum=${this.pageNum}, ` + `layerNum=${this.layerNum}, ` + `thickness=${this.thickness}, ` +
    // `trailNum=${this.trailNum}, ` +
    `recognizeResult=${this.recognizeResult}, ` + `maxX=${this.maxX}, ` + `maxY=${this.maxY}, ` + `angles=${JSON.stringify(this.angles)}, ` + `status=${this.status}, ` + `numInPage=${this.numInPage}, ` + `contoursSrc=${JSON.stringify(this.contoursSrc)}, ` +
    // `factorResize=${this.factorResize}, ` +
    // `filterFlag=${this.filterFlag}, ` +
    `link=${this.link}, ` + `title=${this.title}, ` + `textBox=${this.textBox}, ` + `stroke=${this.stroke}, ` + `geometry=${this.geometry}` + `}`;
  }
}
/**
 * Recognition result data.
 */
export class RecogResultData {
  predict_name = 'others';

  // Upper-left corner
  up_left_point_x = 0;
  up_left_point_y = 0;
  // Key point
  key_point_x = 0;
  key_point_y = 0;

  // Lower-right corner
  down_right_point_x = 0;
  down_right_point_y = 0;
}

/**
 * Link data.
 */
export class Link {
  // Text link
  static CATEGORY_TEXT = 0;
  // Stroke link
  static CATEGORY_TRAIL = 1;

  /**
   * Link category: 0 = text link, 1 = stroke link.
   */
  category = 0;
  X = 0; // Top-left X in page coordinates
  Y = 0; // Top-left Y in page coordinates
  width = 0; // Link width
  height = 0; // Link height
  page = 0; // Current page number
  // public num: number = 0; // Index within the page
  // public index: number = 0; // Export: global link index
  /**
   * Link style mapping.
   * 0: solid underline
   * 1: solid border
   * 2: dashed border
   */
  style = 0;
  /// Link type (must match the native mapping).
  /// 0: jump to note page
  /// 1: note file
  /// 2: document
  /// 3: image
  /// 4: URL
  /// 5: other
  /// 6: digest link (jumps to digest)
  linkType = 0;
  destPath = ''; // Target path. For URL links, this is the URL.
  // public destFileId: string = ""; // Outbound: target file ID; inbound: source file ID
  // public destPageId: string = ""; // Outbound: target page ID; inbound: source page ID
  destPage = 0; // Target page number (only valid when linkType = 0)

  // Text-link-only fields
  fontSize = 0; // Font size
  // public fontPath: string = ""; // Font path
  fullText = ''; // Full text content
  showText = ''; // Display text
  // Font rendering style
  // public anti: number = 1;
  // public bold: number = 1;
  italic = 1;
  // public newDestPageNum: number = 1;// Page after re-resolving
  // Stroke ID list. For stroke links, indicates which strokes belong to this link.
  controlTrailNums = [];
  // Link region points (top-right and bottom-left) in Android screen coordinates.
  // Stroke links do not need to provide this; it can be computed from controlTrailNums. Text links should provide it.
  // public rectPoints: Point[] = [];
}

/**
 * Title data.
 */
export class Title {
  X = 0; // Top-left X in page coordinates
  Y = 0; // Top-left Y in page coordinates
  width = 0; // Title width
  height = 0; // Title height
  page = 0; // Current page number
  num = 0; // Index within the page
  /**
   * Title style mapping.
   * 0: remove title attribute
   * 1: black background title
   * 2: light-gray title
   * 3: dark-gray title
   * 4: shadow title
   */
  style = 0;
  // Stroke ID list. For stroke titles, indicates which strokes belong to this title.
  controlTrailNums = [];
}

/**
 * Text box data.
 */
export class TextBox {
  fontSize = 0.0; // Font size
  fontPath = null; // Font path
  textContentFull = null; // Full text content
  textRect = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  }; // Text box rectangle
  // public textLineHeight: number = 0.0; // Line height
  textDigestData = null; // Digest data
  // public textType: number = 0; // 0: plain text 1: markdown 2: custom format (not rendered by the note engine; stores text + position + related image)
  // public textColor: number = 0; // textPaint.setColor(Color.BLACK); sets text color.
  // public textTypeface: number = 0; // textPaint.setTypeface(Typeface.SERIF); sets typeface (regular/bold/italic, etc.).
  // public letterSpacing: number = 0.0; // textPaint.setLetterSpacing(0.1f); sets character spacing.
  // public lineSpacingExtra: number = 0.0; // Extra line spacing
  // public lineSpacingMultiplier: number = 0.0; // Line-height multiplier. textPaint.setLineSpacing(1.5f, 1.2f); sets extra spacing and multiplier.
  textAlign = 0; // textPaint.setTextAlign(Paint.Align.CENTER); alignment: 0=left, 1=center, 2=right.
  // public textAntiAlias: number = 0; // textPaint.setAntiAlias(true); enables/disables anti-aliasing for smoother text.
  textBold = 0; // Typeface bold: 0=normal, 1=bold
  // public textShadowLayer: number = 0; // textPaint.setShadowLayer(10, 5, 5, Color.GRAY); sets shadow effect.
  // public textVertical: number = 0; // textPaint.setTextVertical(true); enables vertical text layout (commonly used in some languages).
  textItalics = 0; // Typeface italic: 0=normal, 1=italic
  textFrameWidthType = 0; // 0: fixed width 1: auto width
  // Border rendering mode: 0=no border, 3=stroke
  // Optional. For digest text boxes this is 3; others are 0. Currently not editable; can be omitted on insert/update.
  textFrameStyle = 0;
  // public textFrameStrokeColor: number = 0; // Border color
  // public textFrameFillColor: number = 255; // Fill color
  // Editable state: 0=editable, 1=not editable. Optional. Digest text boxes use 1; others use 0.
  // Currently not editable; can be omitted on insert/update.
  textEditable = 0;
  // public textLayer: number = 0; // Layer the text box belongs to
}

/**
 * Stroke data.
 */
export class Stroke {
  penColor = 0; // Pen color: 0xFE=white, 0x9D=dark gray, 0xC9=light gray
  penType = 0; // Pen type: 10=fineliner, 1=pressure pen, 11=marker
  /**
   * Sample point data.
   * Sample points can be large, so they are stored in Android native cache and accessed via ElementDataAccessor.
   */

  /**
   * Pressure data.
   * Pressure data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */

  /**
   * Eraser-line data.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */

  // Eraser-line data (optional; can be omitted when inserting a stroke)
  /**
   * Write-flag data.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */

  /**
   * Marker direction/pressure data. Required for marker pen rendering.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */

  /**
   * Recognition point data.
   * This data can be large, so it is stored in Android native cache and accessed via ElementDataAccessor.
   */

  constructor(uuid) {
    console.log('Stroke constructor uuid:', uuid);
    this.points = new ElementDataAccessor(uuid, ElementPointDataType.STROKE_SAMPLE_POINT, 'point');
    this.pressures = new ElementDataAccessor(uuid, ElementPointDataType.STROKE_PRESSURE_POINT, 'number');
    this.eraseLineTrailNums = new ElementDataAccessor(uuid, ElementPointDataType.ERASE_LINE_DATA, 'number');
    this.flagDraw = new ElementDataAccessor(uuid, ElementPointDataType.WRITE_FLAG, 'boolean');
    this.markPenDirection = new ElementDataAccessor(uuid, ElementPointDataType.MARK_PEN_DIRECTION, 'point');
    this.recognPoints = new ElementDataAccessor(uuid, ElementPointDataType.RECOGNITION_DATA_POINT, 'recognData');
  }

  /**
   * Releases native cached data for this stroke.
   */
  async recycle() {
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
  static TYPE_STRAIGHT_LINE = 'straightLine';
  static TYPE_CIRCLE = 'GEO_circle';
  static TYPE_ELLIPSE = 'GEO_ellipse';
  static TYPE_POLYGON = 'GEO_polygon';
  penColor = 0; // Pen color: 0xFE=white, 0x9D=dark gray, 0xC9=light gray
  penType = 0; // Pen type: 10=fineliner, 1=pressure pen, 11=marker
  penWidth = 0; // Pen width
  type = ''; // straightLine | GEO_circle | GEO_ellipse | GEO_polygon
  points = []; // Polygon points in Android screen coordinates (relative to top-left; not EMR)
  ellipseCenterPoint = null; // Ellipse center
  ellipseMajorAxisRadius = 0; // Major axis radius
  ellipseMinorAxisRadius = 0; // Minor axis radius
  ellipseAngle = 0; // Rotation angle
}
export class FiveStar {
  points = []; // Five-star points in EMR coordinates
}
export class Picture {
  picturePath = ''; // Path to the image file
  rect = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  }; // Image rectangle in EMR coordinates
}

/**
 * Recognition point data.
 */
export class RecognData {
  X = 0;
  Y = 0;
  Flag = 0;
  timestamp = -1;
}
//# sourceMappingURL=Element.js.map