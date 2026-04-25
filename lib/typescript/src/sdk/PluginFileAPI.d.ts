import { Title } from "../model/Element";
import type { APIResponse } from "../response/APIResponse";
/**
 * PluginFileAPI - APIs for file operations.
 */
export default class PluginFileAPI {
    /**
      * Gets page elements, including strokes, links, titles, and text boxes.
      * @param {number} page Page index
      * @param {string} notePath Note file path
      * @returns {Promise<APIResponse<Element[]>>} Page data. See {@link Element} for details.
      */
    static getElements(page: number, notePath: string): Promise<Object | null | undefined>;
    /**
     * Replaces all elements on a page.
     * @param {string} notePath Note file path
     * @param {number} page Page index
     * @param {Element[]} elements Element list
     * @returns {Promise<APIResponse<boolean>>} Replacement result
     */
    static replaceElements(notePath: string, page: number, elements: Object[]): Promise<Object | null | undefined>;
    /**
     * Inserts elements into a page.
     * @param {string} notePath Note file path
     * @param {number} page Page index
     * @param {Element[]} elements Element list
     * @returns {Promise<APIResponse<boolean>>} Insert result
     */
    static insertElements(notePath: string, page: number, elements: Object[]): Promise<Object | null | undefined>;
    /**
    * Modifies existing page elements. Only existing elements can be modified.
    * @param {string} notePath Note file path
    * @param {number} page Page index
    * @param {Element[]} elements Element list
    * @returns {Promise<APIResponse<boolean>>} Modify result
    * Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: number[]   // Indices of elements modified successfully
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
    */
    static modifyElements(notePath: string, page: number, elements: Object[]): Promise<Object | null | undefined>;
    /**
        * Gets title data.
        * @param {string} notePath Note file path
        * @param {number[]} pageList Page list
        * @returns {Promise<APIResponse<Title[]>>}
        */
    static getTitles(notePath: string, pageList: number[]): Promise<APIResponse<Title[]>>;
    /**
     * Gets keywords.
     * @param {string} notePath Note file path
     * @param {number[]} pageList Page list
     * @returns {Promise<APIResponse<KeyWord[]>>}
     */
    static getKeyWords(notePath: string, pageList: number[]): Promise<Object | null | undefined>;
    /**
     * Inserts a keyword.
     * @param {string} notePath Note file path
     * @param {number} page Page index
     * @param {string} keyword Keyword
     * @returns {Promise<APIResponse<boolean>>}
     */
    static insertKeyWord(notePath: string, page: number, keyword: string): Promise<Object | null | undefined>;
    /**
     * Deletes a keyword.
     * @param {string} notePath Note file path
     * @param {number} page Page index where the keyword is located
     * @param {number} index Keyword index within the specified page
     * @returns {Promise<APIResponse<boolean>>}
     */
    static deleteKeyWord(notePath: string, page: number, index: number): Promise<APIResponse<boolean>>;
    /**
      * Gets total page count of a note file.
      * @param {string} notePath Note file path
      * @returns {Promise<APIResponse<number>>}
      */
    static getNoteTotalPageNum(notePath: string): Promise<Object | null | undefined>;
    /**
     * Gets the device type that created this note/annotation file.
     * @param {string} notePath Note file path
     * @returns {Promise<APIResponse<number>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: number   // Device type: 0=A5, 1=A6, 2=A6X, 3=A5X, 4=nomad, 5=Manta
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static getFileMachineType(notePath: string): Promise<Object | null | undefined>;
    /**
     * Gets rotation type of a page.
     * @param {string} notePath Note file path
     * @param {number} page Page index
     * @returns {Promise<APIResponse<number>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  // Rotation type:
     *  // 1000: portrait 0°, 2000: portrait 0° (split left/right)
     *  // 1090: landscape 90°, 2090: landscape 90° (split top/bottom)
     *  // 1180: portrait 180°, 2180: portrait 180° (split left/right)
     *  // 1270: landscape 270°, 2270: landscape 270° (split top/bottom)
     *  result: number
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    /**
    * Gets page size.
    * @param {string} notePath Note file path
    * @param {number} page Page index
    * @returns {Promise<APIResponse<{width: number, height: number}>>} Returns:
    * {
    *  success: boolean  // Whether the API call succeeded
    *  result: {width: number, height: number}   // Page size in pixels
    *  error: { // Present only when success is false
    *    code: number  // Error code
    *    message: string  // Error message
    *  }
    * }
    */
    static getPageSize(notePath: string, page: number): Promise<Object | null | undefined>;
    /**
   * Generates a PNG image for a specific note page.
   * @param {string} params.notePath Note file path
   * @param {number} params.page Page index
   * @param {number} params.times Scale factor: 1 or 2
   * @param {string} params.pngPath Output PNG path
   * @param {number} params.type Output type: 0=transparent background, 1=white background
   * @returns {Promise<APIResponse<boolean>>} Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: boolean   // true=generated successfully, false=generation failed
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   */
    static generateNotePng(params: {
        notePath: string;
        page: number;
        times: number;
        pngPath: string;
        type: number;
    }): Promise<Object | null | undefined>;
    /**
  * Searches pages that contain five-star marks in a file.
  * @param {string} filePath File path
  * @returns {Promise<APIResponse<number[]>>} Returns:
  * {
  *  success: boolean  // Whether the API call succeeded
  *  result: number[]   // Page indices that contain five-star marks
  *  error: { // Present only when success is false
  *    code: number  // Error code
  *    message: string  // Error message
  *  }
  * }
  */
    static searchFiveStars(filePath: string): Promise<Object | null | undefined>;
    /**
       * Creates a note.
       * @param {string} params.notePath Note file path
       * @param {string} params.template Template path
       * @param {number} params.mode Create mode: 0=normal, 1=recognition layout
       * @param {boolean} params.isPortrait Whether portrait orientation is used
       * @returns {Promise<APIResponse<boolean>>} Returns:
       * {
       *  success: boolean  // Whether the API call succeeded
       *  result: boolean   // true=created successfully, false=create failed
       *  error: { // Present only when success is false
       *    code: number  // Error code
       *    message: string  // Error message
       *  }
       * }
       */
    static createNote(params: {
        notePath: string;
        template: string;
        mode: number;
        isPortrait: boolean;
    }): Promise<Object | null | undefined>;
    /**
     * Removes a specific page from a note.
     * @param {string} notePath Note file path
     * @param {number} page Page index
     * @returns {Promise<APIResponse<boolean>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: boolean   // true=removed successfully, false=remove failed
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static removeNotePage(notePath: string, page: number): Promise<Object | null | undefined>;
    /**
     * Inserts a page into a note.
     * @param {string} params.notePath Note file path
     * @param {number} params.page Page index
     * @param {string} params.template Page template name
     * @returns {Promise<APIResponse<boolean>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: boolean   // true=inserted successfully, false=insert failed
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static insertNotePage(params: {
        notePath: string;
        page: number;
        template: string;
    }): Promise<Object | null | undefined>;
    /**
    * Clears elements in a specific layer for a page (note files only).
    * @param {string} notePath Note file path
    * @param {number} page Page index
    * @param {number} layer Layer number
    * @returns {Promise<APIResponse<boolean>>} Returns:
    * {
    *  success: boolean  // Whether the API call succeeded
    *  result: boolean   // true=cleared successfully, false=clear failed
    *  error: { // Present only when success is false
    *    code: number  // Error code
    *    message: string  // Error message
    *  }
    * }
    */
    static clearLayerElements(notePath: string, page: number, layer: number): Promise<APIResponse<boolean>>;
    /**
        * Gets page layer data.
        * @param {string} notePath Note file path
        * @param {number} page Page index
        * @returns {Promise<APIResponse<Layer[]>>} Layer list
        */
    static getLayers(notePath: string, page: number): Promise<Object | null | undefined>;
    /**
   * Modifies page layer data.
   * @param {string} notePath Note file path
   * @param {number} page Page index
   * @param {Layer[]} layers Existing layers to modify; non-existent layers are ignored
   * @returns {Promise<APIResponse<boolean>>} Modify result
   * Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: boolean   // true=modified successfully, false=modify failed
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   */
    static modifyLayers(notePath: string, page: number, layers: Object[]): Promise<Object | null | undefined>;
    /**
  * Inserts a layer.
  * @param {string} notePath Note file path
  * @param {number} page Page index
  * @param {Layer} layer Layer data to insert
  * @returns {Promise<APIResponse<boolean>>} Insert result
  * Returns:
  * {
  *  success: boolean  // Whether the API call succeeded
  *  result: boolean   // true=inserted successfully, false=insert failed
  *  error: { // Present only when success is false
  *    code: number  // Error code
  *    message: string  // Error message
  *  }
  * }
  */
    static insertLayer(notePath: string, page: number, layer: Object): Promise<Object | null | undefined>;
    /**
  * Deletes layers.
  * @param {string} notePath Note file path
  * @param {number} page Page index
  * @param {number[]} layerIds Layer ID list to delete
  * @returns {Promise<APIResponse<boolean>>} Delete result
  * Returns:
  * {
  *  success: boolean  // Whether the API call succeeded
  *  result: boolean   // true=deleted successfully, false=delete failed
  *  error: { // Present only when success is false
  *    code: number  // Error code
  *    message: string  // Error message
  *  }
  * }
  */
    static deleteLayers(notePath: string, page: number, layerIds: number[]): Promise<Object | null | undefined>;
    /**
  * Sorts layers.
  * @param {string} notePath Note file path
  * @param {number} page Page index
  * @param {number[]} layerIds Sorted layer IDs; earlier IDs are placed on top
  * @returns {Promise<APIResponse<boolean>>} Sort result
  * Returns:
  * {
  *  success: boolean  // Whether the API call succeeded
  *  result: boolean   // true=sorted successfully, false=sort failed
  *  error: { // Present only when success is false
  *    code: number  // Error code
  *    message: string  // Error message
  *  }
  * }
  */
    static sortLayers(notePath: string, page: number, layerIds: number[]): Promise<Object | null | undefined>;
    /**
     * Gets the page list of a mark file.
     * @param {string} filePath File path
     * @returns {Promise<APIResponse<number[]>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: number[]   // Page indices in the mark file
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static getMarkPages(filePath: string): Promise<Object | null | undefined>;
    /**
   * Generates a thumbnail image for a mark file page.
   * @param {string} markPath Mark file path
   * @param {number} page Page index
   * @param {string} pngPath Output PNG path
   * @param {object} size Output image size {width: number, height: number}
   * @returns {Promise<APIResponse<boolean>>} Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: boolean   // true=generated successfully, false=generation failed
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   */
    static generateMarkThumbnails(markPath: string, page: number, pngPath: string, size: {
        width: number;
        height: number;
    }): Promise<Object | null | undefined>;
    /**
  * Clears mark stroke data.
  * @param {string} filePath File path
  * @param {number} page Page index
  * @returns {Promise<APIResponse<boolean>>} Returns:
  * {
  *  success: boolean  // Whether the API call succeeded
  *  result: boolean   // true=cleared successfully, false=clear failed
  *  error: { // Present only when success is false
  *    code: number  // Error code
  *    message: string  // Error message
  *  }
  * }
  */
    static clearMarkElements(filePath: string, page: number): Promise<Object | null | undefined>;
    /**
       * Gets the template info for a note page.
       * @param {string} notePath Note file path
       * @param {number} page Page index
       * @returns {Promise<APIResponse<NoteTemplateInfo>>} Returns:
       * {
       *  success: boolean  // Whether the API call succeeded
       *  result: NoteTemplateInfo   // Template info object
       *  error: { // Present only when success is false
       *    code: number  // Error code
       *    message: string  // Error message
       *  }
       * }
       */
    static getNotePageTemplate(notePath: string, page: number): Promise<Object | null | undefined>;
    /**
     * Generates a background-template PNG for a note page.
     * @param {string} notePath Note file path
     * @param {number} page Page index
     * @param {string} pngPath Output PNG path
     * @returns {Promise<APIResponse<boolean>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: boolean   // true=generated successfully, false=generation failed
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static generateNoteTemplatePng(notePath: string, page: number, pngPath: string): Promise<Object | null | undefined>;
    /**
    * Gets note type.
    * @param {string} notePath Note file path
    * @returns {Promise<APIResponse<NoteType>>} Returns:
    * {
    *  success: boolean  // Whether the API call succeeded
    *  result: number   // Note type: 0=normal, 1=recognition
    *  error: { // Present only when success is false
    *    code: number  // Error code
    *    message: string  // Error message
    *  }
    * }
    */
    static getNoteType(notePath: string): Promise<Object | null | undefined>;
    /**
    * Gets the number of elements on a note page.
    * @param {string} notePath Note file path
    * @param {number} page Page index
    * @returns {Promise<APIResponse<number>>} Returns:
    * {
    *  success: boolean  // Whether the API call succeeded
    *  result: number   // Element count on the page
    *  error: { // Present only when success is false
    *    code: number  // Error code
    *    message: string  // Error message
    *  }
    * }
    */
    static getElementCounts(notePath: string, page: number): Promise<Object | null | undefined>;
    /**
    * Gets the element number list for a note page.
    * @param {string} notePath Note file path
    * @param {number} page Page index
    * @returns {Promise<APIResponse<number[]>>} Returns:
    * {
    *  success: boolean  // Whether the API call succeeded
    *  result: number[]   // Element number list for the page
    *  error: { // Present only when success is false
    *    code: number  // Error code
    *    message: string  // Error message
    *  }
    * }
    */
    static getElementNumList(notePath: string, page: number): Promise<Object | null | undefined>;
    /**
     * Gets an element from a note page.
     * @param {string} notePath Note file path
     * @param {number} page Page index
     * @param {number} num Element index within the page
     * @returns {Promise<APIResponse<Element>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: Element   // Element from the note page
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static getElement(notePath: string, page: number, num: number): Promise<Object | null | undefined>;
    /**
   * Gets the last element of the current note page.
   * @returns {Promise<APIResponse<Element>>} Returns:
   * {
   *  success: boolean  // Whether the API call succeeded
   *  result: Element   // Last element in the note page
   *  error: { // Present only when success is false
   *    code: number  // Error code
   *    message: string  // Error message
   *  }
   * }
   */
    static getLastElement(): Promise<Object | null | undefined>;
}
//# sourceMappingURL=PluginFileAPI.d.ts.map