import APIError from "../../error/APIError";
import { Element, ElementDataAccessor } from "../../model/Element";

// Validate element data
export const verifyElement = (element: Element): void => {

  if (element == null) {
    throw new APIError(202, 'element cannot be null or undefined');
  }
  /**
   * Validates whether Element.type is supported.
   * Throws APIError(1006) when it is not supported.
   */
  const validTypes = [
    Element.TYPE_STROKE,
    Element.TYPE_TITLE,
    Element.TYPE_PICTURE,
    Element.TYPE_TEXT,
    Element.TYPE_TEXT_DIGEST_QUOTE,
    Element.TYPE_TEXT_DIGEST_CREATE,
    Element.TYPE_LINK,
    Element.TYPE_GEO,
    Element.TYPE_FIVE_STAR
  ];

  if (!validTypes.includes(element?.type)) {
    throw new APIError(201, 'Invalid element type; cannot call the related API.');
  }
  const elementType = element?.type;

  if (element.layerNum == null) {
    element.layerNum = 0;
  }

  if (elementType === Element.TYPE_TEXT
    || elementType === Element.TYPE_TEXT_DIGEST_QUOTE
    || elementType === Element.TYPE_TEXT_DIGEST_CREATE
    || elementType === Element.TYPE_LINK
    || elementType === Element.TYPE_TITLE
  ) {
    if (element?.layerNum !== 0) {
      throw new APIError(203, 'Text boxes, links, and titles cannot be operated on non-main layers.');
    }
  }


  verifyElementAccessors(element);
}

/**
 * Checks whether an object is an ElementDataAccessor.
 * - Supports instanceof or duck-typing (size/get/async iterator)
 */
function isElementDataAccessor(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (obj instanceof ElementDataAccessor) return true;
  const hasSize = typeof (obj as any).size === 'function';
  const hasGet = typeof (obj as any).get === 'function';
  const hasAsyncIterator = typeof (obj as any)[Symbol.asyncIterator] === 'function';
  return hasSize && hasGet && hasAsyncIterator;
}

/**
 * Validates ElementDataAccessor fields inside an Element.
 * - angles / contoursSrc
 * - stroke.* ElementDataAccessor fields (if present)
 */
function verifyElementAccessors(element: Element): void {
  if ((element as any).angles !== undefined && (element as any).angles !== null) {
    if (!isElementDataAccessor((element as any).angles)) {
      throw new APIError(107, 'angles must be an ElementDataAccessor object');
    }
  }
  if ((element as any).contoursSrc !== undefined && (element as any).contoursSrc !== null) {
    if (!isElementDataAccessor((element as any).contoursSrc)) {
      throw new APIError(107, 'contoursSrc must be an ElementDataAccessor object');
    }
  }

  const stroke: any = (element as any).stroke;
  if (stroke) {
    if (stroke.points !== undefined && stroke.points !== null && !isElementDataAccessor(stroke.points)) {
      throw new APIError(107, 'stroke.points must be an ElementDataAccessor object');
    }
    if (stroke.pressures !== undefined && stroke.pressures !== null && !isElementDataAccessor(stroke.pressures)) {
      throw new APIError(107, 'stroke.pressures must be an ElementDataAccessor object');
    }
    if (stroke.eraseLineTrailNums !== undefined && stroke.eraseLineTrailNums !== null && !isElementDataAccessor(stroke.eraseLineTrailNums)) {
      throw new APIError(107, 'stroke.eraseLineTrailNums must be an ElementDataAccessor object');
    }
    if (stroke.flagDraw !== undefined && stroke.flagDraw !== null && !isElementDataAccessor(stroke.flagDraw)) {
      throw new APIError(107, 'stroke.flagDraw must be an ElementDataAccessor object');
    }
    if (stroke.markPenDirection !== undefined && stroke.markPenDirection !== null && !isElementDataAccessor(stroke.markPenDirection)) {
      throw new APIError(107, 'stroke.markPenDirection must be an ElementDataAccessor object');
    }
    if (stroke.recognPoints !== undefined && stroke.recognPoints !== null && !isElementDataAccessor(stroke.recognPoints)) {
      throw new APIError(107, 'stroke.recognPoints must be an ElementDataAccessor object');
    }
  }
}

/**
 * Generic parameter rule type.
 * - Supports type checks, required, integer, range, non-empty string, enum, regex, nested objects, and array items
 */
export type ParamRule = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
  nonEmpty?: boolean;
  enum?: Array<string | number | boolean>;
  pattern?: RegExp;
  properties?: Record<string, ParamRule>;
  items?: ParamRule;
  custom?: (value: unknown, path: string) => void;
};

/**
 * Generic parameter schema type.
 * - Each top-level key maps to a rule.
 */
export type ParamSchema = Record<string, ParamRule>;

/**
 * Generic parameter validation.
 * - Validates params against schema; throws APIError on invalid input.
 * - When options.allowUnknown=false, disallows keys not declared in schema.
 */
export function verifyParams(schema: ParamSchema, params: unknown, options?: { allowUnknown?: boolean; rootName?: string }): void {
  console.log('verifyParams', schema, params, options);
  const allowUnknown = options?.allowUnknown ?? true;
  const rootName = options?.rootName ?? 'params';

  if (params == null || typeof params !== 'object') {
    throw new APIError(107, `${rootName} must be an object`);
  }

  const obj = params as Record<string, unknown>;
  for (const [key, rule] of Object.entries(schema)) {
    const path = `${rootName}.${key}`;
    const value = obj[key];
    if (value === null && !rule.required) {
      delete obj[key];
      continue;
    }
    const exists = value !== undefined && value !== null;

    if (rule.required && !exists) {
      throw new APIError(107, `${path} is required`);
    }
    if (!exists) {
      continue;
    }

    switch (rule.type) {
      case 'string': {
        if (typeof value !== 'string') {
          throw new APIError(107, `${path} must be a string`);
        }
        if (rule.nonEmpty && value.trim().length === 0) {
          throw new APIError(107, `${path} cannot be an empty string`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          throw new APIError(107, `${path} does not match the required format`);
        }
        if (rule.enum && !rule.enum.includes(value)) {
          throw new APIError(107, `${path} must be one of: ${rule.enum.join(',')}`);
        }
        if (rule.custom) {
          rule.custom(value, path);
        }
        break;
      }
      case 'number': {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new APIError(107, `${path} must be a valid number`);
        }
        if (rule.integer && !Number.isInteger(value)) {
          throw new APIError(107, `${path} must be an integer`);
        }
        if (rule.min !== undefined && value < rule.min) {
          throw new APIError(107, `${path} must be >= ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          throw new APIError(107, `${path} must be <= ${rule.max}`);
        }
        if (rule.enum && !rule.enum.includes(value)) {
          throw new APIError(107, `${path} must be one of: ${rule.enum.join(',')}`);
        }
        if (rule.custom) {
          rule.custom(value, path);
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          throw new APIError(107, `${path} must be a boolean`);
        }
        if (rule.custom) {
          rule.custom(value, path);
        }
        break;
      }
      case 'object': {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new APIError(107, `${path} must be an object`);
        }
        if (rule.properties) {
          verifyParams(rule.properties, value as Record<string, unknown>, { allowUnknown, rootName: path });
        }
        if (rule.custom) {
          rule.custom(value, path);
        }
        break;
      }
      case 'array': {
        if (!Array.isArray(value)) {
          throw new APIError(107, `${path} must be an array`);
        }
        if (rule.items) {
          value.forEach((item, idx) => {
            const itemPath = `${path}[${idx}]`;
            const itemRule = rule.items!;
            // Validate type and basic constraints; nested objects/arrays are handled recursively.
            if (itemRule.type === 'object' && itemRule.properties) {
              verifyParams(itemRule.properties, item as Record<string, unknown>, { allowUnknown, rootName: itemPath });
            } else if (itemRule.type === 'array' && itemRule.items) {
              verifyParams({ __items__: itemRule }, { __items__: item }, { allowUnknown, rootName: itemPath });
            } else {
              verifyParams({ __item__: itemRule }, { __item__: item }, { allowUnknown, rootName: itemPath });
            }
            if (itemRule.custom) {
              itemRule.custom(item, itemPath);
            }
          });
        }
        if (rule.custom) {
          rule.custom(value, path);
        }
        break;
      }
      default:
        throw new APIError(7014, `${path} has an unknown type rule`);
    }
  }

  if (!allowUnknown) {
    const unknownKeys = Object.keys(obj).filter(k => !(k in schema));
    if (unknownKeys.length > 0) {
      throw new APIError(107, `${rootName} contains undeclared fields: ${unknownKeys.join(',')}`);
    }
  }
}

/**
 * Built-in Rect schema.
 * - Validates {left, top, right, bottom}
 */
export const RectSchema: ParamSchema = {
  left: { type: 'number', required: true, integer: true },
  top: { type: 'number', required: true, integer: true },
  right: { type: 'number', required: true, integer: true },
  bottom: { type: 'number', required: true, integer: true },
};

/**
 * Built-in Size schema.
 * - Validates {width, height}
 */
export const SizeSchema: ParamSchema = {
  width: { type: 'number', required: true, integer: true, min: 1 },
  height: { type: 'number', required: true, integer: true, min: 1 },
};

/**
 * Point schema.
 */
export const PointSchema: ParamSchema = {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
};

/**
 * Layer schema.
 * - Validates core fields of a layer object.
 */
export const LayerSchema: ParamSchema = {
  layerId: { type: 'number', required: true, integer: true, min: 0, max: 3 },
  name: { type: 'string', required: true, nonEmpty: true },
  isCurrentLayer: { type: 'boolean', required: true },
  isVisible: { type: 'boolean', required: true },
};

/**
 * Element schema (with business rules).
 * - Uses custom validation to enforce business rules (including ElementDataAccessor checks).
 */
export const ElementSchema: ParamRule = {
  type: 'object',
  properties: {
    uuid: { type: 'string', nonEmpty: true },
    type: {
      type: 'number',
      required: true,
      integer: true,
    },
    pageNum: { type: 'number', integer: true, min: 0 },
    layerNum: { type: 'number', integer: true },
    thickness: { type: 'number' },
    numInPage: { type: 'number', integer: true, min: 0 },
    maxX: { type: 'number', },
    maxY: { type: 'number', },
    recognizeResult: { type: 'object', },
    angles: {
      type: 'object',
      custom: (v, p) => {
        if (v != null && !isElementDataAccessor(v)) {
          throw new APIError(107, `${p} must be an ElementDataAccessor object`);
        }
      },
    },
    contoursSrc: {
      type: 'object',
      custom: (v, p) => {
        if (v != null && !isElementDataAccessor(v)) {
          throw new APIError(107, `${p} must be an ElementDataAccessor object`);
        }
      },
    },
  },
  custom: (val, path) => {
    const t = (val as any)?.type;
    // Validate only the sub-object that matches type; other sub-objects are not validated.
    const root = val as any;
    const rootName = path;
    switch (t) {
      case Element.TYPE_STROKE: {
        if (!root.stroke) {
          throw new APIError(107, `${path}.stroke must exist (required by type)`);
        }
        verifyParams({
          penColor: { type: 'number', integer: true },
          penType: { type: 'number', integer: true,},
          penWidth: { type: 'number', min: 1 },
          points: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
          pressures: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
          eraseLineTrailNums: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(2107016, `${p} must be an ElementDataAccessor object`); } },
          flagDraw: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
          markPenDirection: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(1072018, `${p} must be an ElementDataAccessor object`); } },
          recognPoints: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
        }, root.stroke, { allowUnknown: true, rootName: `${rootName}.stroke` });
        break;
      }
      case Element.TYPE_LINK: {
        if (!root.link) {
          throw new APIError(107, `${path}.link must exist (required by type)`);
        }
        verifyParams({
          category: { type: 'number', integer: true,required:true },
          X: { type: 'number', min: 0,required:true },
          Y: { type: 'number', min: 0,required:true  },
          width: { type: 'number', min: 0,required:true  },
          height: { type: 'number', min: 0,required:true  },
          page: { type: 'number', integer: true, min: 0  },
          num: { type: 'number', integer: true, min: 0  },
          index: { type: 'number', integer: true, min: 0 },
          style: { type: 'number', integer: true, required:true },
          linkType: { type: 'number', integer: true, required:true },
          destPath: { type: 'string', nonEmpty: false },
          destPage: { type: 'number', integer: true},
          fullText: { type: 'string', nonEmpty: false  },
          showText: { type: 'string', nonEmpty: false  },
          italic: { type: 'number', integer: true, enum: [0, 1] },
          controlTrailNums: { type: 'array', items: { type: 'number', integer: true, min: 0 } },
        }, root.link, { allowUnknown: true, rootName: `${rootName}.link` });
        break;
      }
      case Element.TYPE_TEXT:
      case Element.TYPE_TEXT_DIGEST_QUOTE:
      case Element.TYPE_TEXT_DIGEST_CREATE: {
        if (!root.textBox) {
          throw new APIError(107, `${path}.textBox must exist (required by type)`);
        }
        verifyParams({
          fontSize: { type: 'number', min: 1 },
          fontPath: { type: 'string' },
          textContentFull: { type: 'string',required:true, nonEmpty:true },
          textRect: { type: 'object', properties: RectSchema, custom: (v: any, p) => {
            const { left, top, right, bottom } = v || {};
            if ([left, top, right, bottom].some((n: any) => typeof n !== 'number') || right - left <= 0 || bottom - top <= 0) {
              throw new APIError(107, `${p} must be a non-zero-area rectangle`);
            }
          }, required:true},
          textDigestData: { type: 'string' },
          textAlign: { type: 'number', integer: true },
          textBold: { type: 'number', integer: true},
          textItalics: { type: 'number', integer: true },
          textFrameWidthType: { type: 'number', integer: true},
          textFrameWidth: { type: 'number', integer: true},
          textFrameStyle: { type: 'number', integer: true },
          textEditable: { type: 'number', integer: true},
        }, root.textBox, { allowUnknown: true, rootName: `${rootName}.textBox` });
        break;
      }
      case Element.TYPE_GEO: {
        if (!root.geometry) {
          throw new APIError(107, `${path}.geometry must exist (required by type)`);
        }
        verifyParams(GeometrySchema, root.geometry, { allowUnknown: true, rootName: `${rootName}.geometry` });
        break;
      }
      case Element.TYPE_FIVE_STAR: {
        if (!root.fiveStar) {
          throw new APIError(107, `${path}.fiveStar must exist (required by type)`);
        }
        verifyParams({
          points: { type: 'array', items: { type: 'object', properties: PointSchema } },
        }, root.fiveStar, { allowUnknown: true, rootName: `${rootName}.fiveStar` });
        break;
      }
      case Element.TYPE_TITLE: {
        if (!root.title) {
          throw new APIError(107, `${path}.title must exist (required by type)`);
        }
        verifyParams({
          X: { type: 'number', min: 0 },
          Y: { type: 'number', min: 0 },
          width: { type: 'number', min: 0 },
          height: { type: 'number', min: 0 },
          page: { type: 'number', integer: true, min: 0 },
          num: { type: 'number', integer: true, min: 0 },
          style: { type: 'number', integer: true },
          controlTrailNums: { type: 'array', items: { type: 'number', integer: true, min: 0 } },
        }, root.title, { allowUnknown: true, rootName: `${rootName}.title` });
        break;
      }
      default:
        break;
    }
  },
};

/**
 * ElementStrokeSchema rules.
 * - Only for stroke elements (type=Element.TYPE_STROKE).
 * - Validates angles/contoursSrc ElementDataAccessor types.
 * - Requires stroke and validates its ElementDataAccessor fields.
 */
export const ElementStrokeSchema: ParamRule = {
  type: 'object',
  properties: {
    uuid: { type: 'string', nonEmpty: true },
    type: {
      type: 'number',
      required: true,
      integer: true,
      enum: [Element.TYPE_STROKE],
    },
    pageNum: { type: 'number', integer: true, min: 0 },
    layerNum: { type: 'number', integer: true, min: 0, max: 3 },
    thickness: { type: 'number'},
    angles: {
      type: 'object',
      custom: (v, p) => {
        if (v != null && !isElementDataAccessor(v)) {
          throw new APIError(107, `${p} must be an ElementDataAccessor object`);
        }
      },
    },
    contoursSrc: {
      type: 'object',
      custom: (v, p) => {
        if (v != null && !isElementDataAccessor(v)) {
          throw new APIError(107, `${p} must be an ElementDataAccessor object`);
        }
      },
    },
  },
  custom: (val, path) => {
    const root = val as any;
    if (root?.type !== Element.TYPE_STROKE) {
      throw new APIError(107, `${path}.type must be stroke type (0)`);
    }
    if (!root.stroke) {
      throw new APIError(107, `${path}.stroke must exist (required by type)`);
    }
    verifyParams({
      penColor: { type: 'number', integer: true },
      penType: { type: 'number', integer: true, },
      points: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
      pressures: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
      eraseLineTrailNums: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
      flagDraw: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
      markPenDirection: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
      recognPoints: { type: 'object', custom: (v, p) => { if (v != null && !isElementDataAccessor(v)) throw new APIError(107, `${p} must be an ElementDataAccessor object`); } },
    }, root.stroke, { allowUnknown: true, rootName: `${path}.stroke` });
  },
};

export const GeometrySchema:ParamSchema ={
  penColor: { type: 'number', integer: true },
  penType: { type: 'number', integer: true },
  penWidth: { type: 'number', min: 1 },
  type: { type: 'string',required: true },
  points: { type: 'array', items: { type: 'object', properties: PointSchema } },
  ellipseCenterPoint: { type: 'object', properties: PointSchema },
  ellipseMajorAxisRadius: { type: 'number'},
  ellipseMinorAxisRadius: { type: 'number'},
  ellipseAngle: { type: 'number' },

};
