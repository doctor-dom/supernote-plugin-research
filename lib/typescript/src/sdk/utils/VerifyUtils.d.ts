import { Element } from "../../model/Element";
export declare const verifyElement: (element: Element) => void;
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
export declare function verifyParams(schema: ParamSchema, params: unknown, options?: {
    allowUnknown?: boolean;
    rootName?: string;
}): void;
/**
 * Built-in Rect schema.
 * - Validates {left, top, right, bottom}
 */
export declare const RectSchema: ParamSchema;
/**
 * Built-in Size schema.
 * - Validates {width, height}
 */
export declare const SizeSchema: ParamSchema;
/**
 * Point schema.
 */
export declare const PointSchema: ParamSchema;
/**
 * Layer schema.
 * - Validates core fields of a layer object.
 */
export declare const LayerSchema: ParamSchema;
/**
 * Element schema (with business rules).
 * - Uses custom validation to enforce business rules (including ElementDataAccessor checks).
 */
export declare const ElementSchema: ParamRule;
/**
 * ElementStrokeSchema rules.
 * - Only for stroke elements (type=Element.TYPE_STROKE).
 * - Validates angles/contoursSrc ElementDataAccessor types.
 * - Requires stroke and validates its ElementDataAccessor fields.
 */
export declare const ElementStrokeSchema: ParamRule;
export declare const GeometrySchema: ParamSchema;
//# sourceMappingURL=VerifyUtils.d.ts.map