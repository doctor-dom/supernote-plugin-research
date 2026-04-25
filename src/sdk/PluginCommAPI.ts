import NativePluginAPI from '../module/NativePluginAPI';
import { APIResponse } from '../response/APIResponse';

import {
  Element,
  Stroke,
  type Point,
  ElementDataAccessor,
  ElementPointDataType,
  ElementType,
  RecognData,
  transformElements,
  Geometry,
} from '../model/Element';
import type { LassoElementTypeNum } from '../model/lasso/LassoElementTypeNum';
import type { Layer } from '../model/Layer';
import type { KeyWord } from '../model/KeyWord';
import type { LargeData } from '../model/LargeData';
import type { ModifyLassoTitle } from '../model/lasso/ModifyLassoTitle';
import type { LassoLink, ModifyLassoLink, TextLink } from '../model/LassoData';
import APIError from '../error/APIError';
import { verifyParams, RectSchema, SizeSchema, ElementSchema, ElementStrokeSchema, PointSchema, GeometrySchema } from './utils/VerifyUtils';

/**
 * PluginCommAPI - APIs for interacting with the native note app.
 */
export default class PluginCommAPI {
  /**
   * Creates a new Element (Trail) object.

   * @param {number} type Element type. See {@link ElementType}.
   * @returns {Promise<APIResponse<Element>>} Returns an APIResponse containing the created Element:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: Element   // Returned Element. See {@link Element} for details
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   *
   */
  static async createElement(
    type: number
  ): Promise<Object | null | undefined> {
    try {
      verifyParams(
        {
          type: {
            type: 'number',
            required: true,
            integer: true,
          },
        },
        {  type },
        { allowUnknown: false, rootName: 'createElement' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    const trailRe = await NativePluginAPI.createElement( type) as APIResponse<Element>;


    if(!trailRe.success){
      return trailRe;
    }
    const trail = trailRe.result as Element;
    if (!trail?.angles) {
      trail.angles = new ElementDataAccessor<Point>(
        trail.uuid,
        ElementPointDataType.ANGLE_POINT,
        'point'
      );
    }
    if (!trail?.contoursSrc) {
      trail.contoursSrc = new ElementDataAccessor<Point[]>(
        trail.uuid,
        ElementPointDataType.CONTOUR_POINT,
        'pointArray'
      );
    }

    if (trail?.type === Element.TYPE_STROKE) {
      if (!trail?.stroke) {
        trail.stroke = {} as Stroke;
      }
      let stroke = trail?.stroke;
      if (!stroke?.points) {
        stroke.points = new ElementDataAccessor<Point>(
          trail.uuid,
          ElementPointDataType.STROKE_SAMPLE_POINT,
          'point'
        );
      }

      if (!stroke?.pressures) {
        stroke.pressures = new ElementDataAccessor<number>(
          trail.uuid,
          ElementPointDataType.STROKE_PRESSURE_POINT,
          'number'
        );
      }
      if (!stroke?.eraseLineTrailNums) {
        stroke.eraseLineTrailNums = new ElementDataAccessor<number>(
          trail.uuid,
          ElementPointDataType.ERASE_LINE_DATA,
          'number'
        );
      }
      if (!stroke?.flagDraw) {
        stroke.flagDraw = new ElementDataAccessor<boolean>(
          trail.uuid,
          ElementPointDataType.WRITE_FLAG,
          'boolean'
        );
      }
      if (!stroke?.markPenDirection) {
        stroke.markPenDirection = new ElementDataAccessor<Point>(
          trail.uuid,
          ElementPointDataType.MARK_PEN_DIRECTION,
          'point'
        );
      }

      if (!stroke?.recognPoints) {
        stroke.recognPoints = new ElementDataAccessor<RecognData>(
          trail.uuid,
          ElementPointDataType.RECOGNITION_DATA_POINT,
          'point'
        );
      }
    }

    return trailRe;
  }

  /**
   * Recycles an Element (Trail) object.
   * @param {string} uuid Element UUID
   */
  static recycleElement(uuid: string): void {
    try {
      verifyParams(
        { uuid: { type: 'string', required: true, nonEmpty: true } },
        { uuid },
        { allowUnknown: false, rootName: 'recycleElement' }
      );
    } catch (error) {
      throw error;
    }
    NativePluginAPI.recycleElement(uuid);
  }

    /**
     * Clears the Android local cache for Elements (Trails). After clearing, old Element objects become unusable.
     * @description Clears the cache of all created Element objects.
     */
   static clearElementCache(): void {
    return NativePluginAPI.clearElementCache();
   }



  /**
   * Saves the lasso-selected elements as a sticker.
   * @param {string} path Sticker output path
   * @returns {Promise<APIResponse<boolean>>} Returns an APIResponse where result is a boolean
   */
  static async saveStickerByLasso(path: string): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        { path: { type: 'string', required: true, nonEmpty: true } },
        { path },
        { allowUnknown: false, rootName: 'saveStickerByLasso' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.saveStickerByLasso(
      path
    )) as APIResponse<boolean>;
  }

  /**
   * Saves elements within the specified rectangle as a sticker.
   * @param {string} path Path to save the sticker
   * @param {Object} rect Rectangle coordinates: left/top/right/bottom
   * @returns {Promise<APIResponse<boolean>>}
   */
  // static async saveSticker(
  //   path: string,
  //   rect: { left: number; top: number; right: number; bottom: number }
  // ): Promise<APIResponse<boolean>> {
  //   return await NativePluginAPI.saveSticker(path, rect) as APIResponse<boolean>;
  // }

  /**
   * Gets the sticker dimensions.
   * @param {string} path Sticker path
   * @returns {Promise<APIResponse<{width: number, height: number}>>}
   */
  static async getStickerSize(
    path: string
  ): Promise<APIResponse<{ width: number; height: number }>> {
    try {
      verifyParams(
        { path: { type: 'string', required: true, nonEmpty: true } },
        { path },
        { allowUnknown: false, rootName: 'getStickerSize' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.getStickerSize(path)) as APIResponse<{
      width: number;
      height: number;
    }>;
  }

  /**
   * Generates a sticker thumbnail.
   * @param {string} stickerPath Source sticker path
   * @param {string} thumbnailPath Output thumbnail path
   * @param {number} width Thumbnail width (keep aspect ratio with original)
   * @param {number} height Thumbnail height (keep aspect ratio with original)
   * @returns {Promise<APIResponse<boolean>>} Returns APIResponse<boolean>; result=true means success
   */
  static async generateStickerThumbnail(
    stickerPath: string,
    thumbnailPath: string,
    size: { width: number; height: number }
  ): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        {
          stickerPath: { type: 'string', required: true, nonEmpty: true },
          thumbnailPath: { type: 'string', required: true, nonEmpty: true, pattern: /\.png$/i },
          size: { type: 'object', required: true, properties: SizeSchema },
        },
        { stickerPath, thumbnailPath, size },
        { allowUnknown: false, rootName: 'generateStickerThumbnail' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.generateStickerThumbnail(
      stickerPath,
      thumbnailPath,
      size
    )) as APIResponse<boolean>;
  }

  /**
   * Converts elements to a sticker.
   * @param {number} params.machineType Device type: 0=A5, 1=A6, 2=A6X, 3=A5X, 4=nomad, 5=Manta
   * @param {Element[]} params.elements Element data
   * @param {string} params.stickerPath Output path for the generated sticker
   * @returns {Promise<APIResponse<boolean>>} Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: boolean   // true=converted successfully, false=conversion failed
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   */
  static async convertElement2Sticker(params: {
    machineType: number;
    elements: Object[];
    stickerPath: string;
  }): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        {
          machineType: { type: 'number', required: true, integer: true, min: 0 },
          elements: {
            type: 'array',
            required: true
          },
          stickerPath: { type: 'string', required: true, nonEmpty: true },
        },
        params,
        { allowUnknown: false, rootName: 'convertElement2Sticker' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.convertElement2Sticker(
      params
    )) as APIResponse<boolean>;
  }

  /**
   * Inserts a sticker.
   * @param {string} path Path of sticker to insert
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async insertSticker(path: string): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        { path: { type: 'string', required: true, nonEmpty: true } },
        { path },
        { allowUnknown: false, rootName: 'insertSticker' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.insertSticker(path)) as APIResponse<boolean>;
  }

  /**
   * Sets lasso box state.
   * @param {number} state Lasso box state: 0=Show, 1=Hide, 2=Completely remove
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async setLassoBoxState(state: number): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        { state: { type: 'number', required: true, integer: true } },
        { state },
        { allowUnknown: false, rootName: 'setLassoBoxState' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.setLassoBoxState(
      state
    )) as APIResponse<boolean>;
  }

  /**
   * Gets the lasso box rectangle.
   * @returns {Promise<APIResponse<{left: number, top: number, right: number, bottom: number}>>} Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: {left: number, top: number, right: number, bottom: number} // Rectangle returned by the API
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   */
  static async getLassoRect(): Promise<APIResponse<Object>> {
    return (await NativePluginAPI.getLassoRect()) as APIResponse<Object>;
  }

  /**
   * Updates the lasso box rectangle.
   * @param {rect:{left: number, top: number, right: number, bottom: number}} rect Lasso box rectangle
   * @returns {Promise<APIResponse<boolean>>} Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: boolean   // true=updated successfully, false=update failed
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   */
  static async updateLassoRect(rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }): Promise<APIResponse<boolean>> {
    try {
      verifyParams(RectSchema, rect, { allowUnknown: false, rootName: 'updateLassoRect' });
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.updateLassoRect(
      rect
    )) as APIResponse<boolean>;
  }

  /**
   * Set slider bar status
   * @param {boolean} status true: Slidable, false: Not slidable
   */
  static async setSlideBarStatus(status: boolean): Promise<boolean> {
    try {
      verifyParams(
        { status: { type: 'boolean', required: true } },
        { status },
        { allowUnknown: false, rootName: 'setSlideBarStatus' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }

    return await NativePluginAPI.setSlideBarStatus(status);
  }

  /**
   * Sets system dormancy state.
   * @param {boolean} enable true=prevent sleep, false=allow sleep
   */
  static setSystemDormancyState(enable: boolean): void {
    try {
      verifyParams(
        { enable: { type: 'boolean', required: true } },
        { enable },
        { allowUnknown: false, rootName: 'setSystemDormancyState' }
      );
    } catch (error) {
       if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    NativePluginAPI.setSystemDormancyState(enable);
  }

  /**
   * Sets status bar and slide bar lock state.
   * @param {boolean} isLock true=locked (disabled), false=unlocked (enabled)
   */
  static setStatusBarAndSlideBarState(isLock: boolean): void {
    try {
      verifyParams(
        { isLock: { type: 'boolean', required: true } },
        { isLock },
        { allowUnknown: false, rootName: 'setStatusBarAndSlideBarState' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    NativePluginAPI.setStatusBarAndSlideBarState(isLock);
  }

  /**
   * Gets lasso elements.
   * @returns {Promise<APIResponse<Element[]>>} Lasso elements
   */
  static async getLassoElements(): Promise<Object | null | undefined> {
    const response = (await NativePluginAPI.getLassoElements()) as APIResponse<
      Object | null | undefined
    >;

    if (response.success) {
      transformElements(response.result as any[]);
    }
    return response;
  }

  /**
   * Gets lasso element type counts.
   * @returns {Promise<APIResponse<LassoElementTypeNum>>} Type counts
   */
  static async getLassoElementTypeCounts(): Promise<
    APIResponse<LassoElementTypeNum>
  > {
    return (await NativePluginAPI.getLassoElementTypeCounts()) as APIResponse<LassoElementTypeNum>;
  }

  /**
   * Deletes lasso elements.
   * @returns {Promise<APIResponse<boolean>>} Deletion result
   */
  static async deleteLassoElements(): Promise<APIResponse<boolean>> {
    return (await NativePluginAPI.deleteLassoElements()) as APIResponse<boolean>;
  }

  /**
   * Gets current page number.
   * @returns {Promise<APIResponse<number>>}
   */
  static async getCurrentPageNum(): Promise<Object | null | undefined> {
    return await NativePluginAPI.getCurrentPageNum();
  }

  /**
   * Gets current file path.
   * @returns {Promise<APIResponse<string>>}
   */
  static async getCurrentFilePath(): Promise<Object | null | undefined> {
    return await NativePluginAPI.getCurrentFilePath();
  }

  /**
   * Reloads the current file.
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async reloadFile(): Promise<Object | null | undefined> {
    return await NativePluginAPI.reloadFile();
  }

  /**
   * Gets lasso geometries.
   * @returns {Promise<APIResponse<Geometry[]>>}
   */
  static async getLassoGeometries(): Promise<Object | null | undefined> {
    return await NativePluginAPI.getLassoGeometries();
  }

  /**
   * Inserts a geometry.
   * @param {Geometry} geometry Geometry params
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async insertGeometry(geometry: Object): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        {
          geometry: {
            type: 'object',
            required: true,
            properties: GeometrySchema,
          },
        },
        { geometry },
        { allowUnknown: true, rootName: 'insertGeometry' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.insertGeometry(geometry)) as APIResponse<boolean>;
  }

  /**
   * Modifies a lasso geometry.
   * @param {Geometry} geometry Geometry params
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async modifyLassoGeometry(
    geometry: Object
  ): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        {
          geometry: {
            type: 'object',
            required: true,
            properties: GeometrySchema,
          },
        },
        { geometry },
        { allowUnknown: true, rootName: 'modifyLassoGeometry' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } } as any;
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } } as any;
      }
    }
    return (await NativePluginAPI.modifyLassoGeometry(geometry)) as APIResponse<boolean>;
  }

  /**
   * Gets built-in note templates.
   * @returns {Promise<Template[]>} Template list
   */
  static async getNoteSystemTemplates(): Promise<Object[] | null | undefined> {
    return (await NativePluginAPI.getNoteSystemTemplates()) as
      | Object[]
      | null
      | undefined;
  }

    /**
   * Inserts a five-point star into the current file and page. For note files, it is inserted into the current layer.
   * @param {Object[]|null|undefined} starPoints Star points array. Must contain 6 points in {x:number,y:number} format;
   *                                             the first and last points must be identical.
   * @returns {Promise<APIResponse<boolean>>} Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: boolean   // Whether insertion succeeded
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
  *  }
  * }
  */
  static async insertFiveStar(
    starPoints: Object[] | null | undefined
  ): Promise<APIResponse<boolean>> {
    try {
      verifyParams(
        {
          starPoints: {
            type: 'array',
            required: true,
            items: { type: 'object', properties: PointSchema },
          },
        },
        { starPoints },
        { allowUnknown: true, rootName: 'insertFiveStar' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return {
          success: false,
          error: { code: error.code, message: error.message },
        } as any;
      } else {
        return {
          success: false,
          error: { code: 100, message: (error as Error).message },
        } as any;
      }
    }
    return (await NativePluginAPI.insertFiveStar(starPoints)) as APIResponse<boolean>;
  }
}
