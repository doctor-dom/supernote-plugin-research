import { APIResponse } from '../response/APIResponse';
import type { LassoElementTypeNum } from '../model/lasso/LassoElementTypeNum';
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
    static createElement(type: number): Promise<Object | null | undefined>;
    /**
     * Recycles an Element (Trail) object.
     * @param {string} uuid Element UUID
     */
    static recycleElement(uuid: string): void;
    /**
     * Clears the Android local cache for Elements (Trails). After clearing, old Element objects become unusable.
     * @description Clears the cache of all created Element objects.
     */
    static clearElementCache(): void;
    /**
     * Saves the lasso-selected elements as a sticker.
     * @param {string} path Sticker output path
     * @returns {Promise<APIResponse<boolean>>} Returns an APIResponse where result is a boolean
     */
    static saveStickerByLasso(path: string): Promise<APIResponse<boolean>>;
    /**
     * Saves elements within the specified rectangle as a sticker.
     * @param {string} path Path to save the sticker
     * @param {Object} rect Rectangle coordinates: left/top/right/bottom
     * @returns {Promise<APIResponse<boolean>>}
     */
    /**
     * Gets the sticker dimensions.
     * @param {string} path Sticker path
     * @returns {Promise<APIResponse<{width: number, height: number}>>}
     */
    static getStickerSize(path: string): Promise<APIResponse<{
        width: number;
        height: number;
    }>>;
    /**
     * Generates a sticker thumbnail.
     * @param {string} stickerPath Source sticker path
     * @param {string} thumbnailPath Output thumbnail path
     * @param {number} width Thumbnail width (keep aspect ratio with original)
     * @param {number} height Thumbnail height (keep aspect ratio with original)
     * @returns {Promise<APIResponse<boolean>>} Returns APIResponse<boolean>; result=true means success
     */
    static generateStickerThumbnail(stickerPath: string, thumbnailPath: string, size: {
        width: number;
        height: number;
    }): Promise<APIResponse<boolean>>;
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
    static convertElement2Sticker(params: {
        machineType: number;
        elements: Object[];
        stickerPath: string;
    }): Promise<APIResponse<boolean>>;
    /**
     * Inserts a sticker.
     * @param {string} path Path of sticker to insert
     * @returns {Promise<APIResponse<boolean>>}
     */
    static insertSticker(path: string): Promise<APIResponse<boolean>>;
    /**
     * Sets lasso box state.
     * @param {number} state Lasso box state: 0=Show, 1=Hide, 2=Completely remove
     * @returns {Promise<APIResponse<boolean>>}
     */
    static setLassoBoxState(state: number): Promise<APIResponse<boolean>>;
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
    static getLassoRect(): Promise<APIResponse<Object>>;
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
    static updateLassoRect(rect: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    }): Promise<APIResponse<boolean>>;
    /**
     * Set slider bar status
     * @param {boolean} status true: Slidable, false: Not slidable
     */
    static setSlideBarStatus(status: boolean): Promise<boolean>;
    /**
     * Sets system dormancy state.
     * @param {boolean} enable true=prevent sleep, false=allow sleep
     */
    static setSystemDormancyState(enable: boolean): void;
    /**
     * Sets status bar and slide bar lock state.
     * @param {boolean} isLock true=locked (disabled), false=unlocked (enabled)
     */
    static setStatusBarAndSlideBarState(isLock: boolean): void;
    /**
     * Gets lasso elements.
     * @returns {Promise<APIResponse<Element[]>>} Lasso elements
     */
    static getLassoElements(): Promise<Object | null | undefined>;
    /**
     * Gets lasso element type counts.
     * @returns {Promise<APIResponse<LassoElementTypeNum>>} Type counts
     */
    static getLassoElementTypeCounts(): Promise<APIResponse<LassoElementTypeNum>>;
    /**
     * Deletes lasso elements.
     * @returns {Promise<APIResponse<boolean>>} Deletion result
     */
    static deleteLassoElements(): Promise<APIResponse<boolean>>;
    /**
     * Gets current page number.
     * @returns {Promise<APIResponse<number>>}
     */
    static getCurrentPageNum(): Promise<Object | null | undefined>;
    /**
     * Gets current file path.
     * @returns {Promise<APIResponse<string>>}
     */
    static getCurrentFilePath(): Promise<Object | null | undefined>;
    /**
     * Reloads the current file.
     * @returns {Promise<APIResponse<boolean>>}
     */
    static reloadFile(): Promise<Object | null | undefined>;
    /**
     * Gets lasso geometries.
     * @returns {Promise<APIResponse<Geometry[]>>}
     */
    static getLassoGeometries(): Promise<Object | null | undefined>;
    /**
     * Inserts a geometry.
     * @param {Geometry} geometry Geometry params
     * @returns {Promise<APIResponse<boolean>>}
     */
    static insertGeometry(geometry: Object): Promise<APIResponse<boolean>>;
    /**
     * Modifies a lasso geometry.
     * @param {Geometry} geometry Geometry params
     * @returns {Promise<APIResponse<boolean>>}
     */
    static modifyLassoGeometry(geometry: Object): Promise<APIResponse<boolean>>;
    /**
     * Gets built-in note templates.
     * @returns {Promise<Template[]>} Template list
     */
    static getNoteSystemTemplates(): Promise<Object[] | null | undefined>;
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
    static insertFiveStar(starPoints: Object[] | null | undefined): Promise<APIResponse<boolean>>;
}
//# sourceMappingURL=PluginCommAPI.d.ts.map