import type { LassoLink } from "../model/LassoData";
import type { APIResponse } from "../response/APIResponse";
import type { TextBox, Title } from "../model/Element";
export default class PluginNoteAPI {
    /**
       * Gets lasso link data.
       * @returns {Promise<APIResponse<LassoLink>>} Lasso links
       */
    static getLassoLinks(): Promise<APIResponse<LassoLink[]>>;
    /**
     * Sets the lasso-selected strokes as a link.
     * @param {string} params.destPath Destination file path. When linkType is 3 (url), this should be the URL.
     * @param {number} params.destPage Destination page index
     * @param {number} params.style Link style: 0=solid underline, 1=solid border, 2=dashed border
     * @param {number} params.linkType Link type: 0=note page, 1=note file, 2=document, 3=image, 4=website
     * @returns {Promise<APIResponse<number>>} Result code: 0=success, -1=failure, -2=destination needs upgrade
     */
    static setLassoStrokeLink(params: {
        destPath: string;
        destPage: number;
        style: number;
        linkType: number;
    }): Promise<APIResponse<number>>;
    /**
     * Inserts a text link.
     * @param {TextLink} textLink Text link data. See {@link TextLink} for editable fields.
     * @returns {Promise<APIResponse<number>>}
     */
    static insertTextLink(textLink: Object): Promise<Object | null | undefined>;
    /**
     * Modifies link data.
     * @param {ModifyLassoLink} modifyLink Link data
     * @returns {Promise<APIResponse<boolean>>}
     */
    static modifyLassoLink(modifyLink: Object): Promise<Object | null | undefined>;
    /**
  * Saves the current note. If APIs like replaceElements/insertElements/modifyElements operate on the currently opened file,
  * call this API first to avoid data inconsistencies.
  * @returns {Promise<APIResponse<boolean>>} Save result
  * Returns:
  * {
  *  success: boolean  // Whether the API call succeeded
  *  result: boolean   // true=saved successfully, false=save failed
  *  error: { // Present only when success is false
  *    code: number  // Error code
  *    message: string  // Error message
  *  }
  * }
  */
    static saveCurrentNote(): Promise<Object | null | undefined>;
    /**
      * Sets lasso strokes as a title, or modifies current lasso title parameters.
     * @param {number} params.style Title style: 0=remove title, 1=black background, 2=light gray, 3=dark gray, 4=shadow
     * @returns {Promise<APIResponse<boolean>>}
     */
    static setLassoTitle(params: {
        style: number;
    }): Promise<APIResponse<boolean>>;
    /**
     * Gets lasso titles.
     * @returns {Promise<APIResponse<Title>>}
     */
    static getLassoTitles(): Promise<APIResponse<Title[]>>;
    /**
     * Modifies lasso title.
     * @param {number} style Title style: 0=remove title, 1=black background, 2=light gray, 3=dark gray, 4=shadow
     * @returns {Promise<APIResponse<boolean>>}
     */
    static modifyLassoTitle(params: {
        style: number;
    }): Promise<APIResponse<boolean>>;
    /**
      * Gets lasso text boxes.
      * @returns {Promise<APIResponse<TextBox[]>>}
      */
    static getLassoText(): Promise<APIResponse<TextBox[]>>;
    /**
     * Inserts a text box.
     * @param {TextBox} textBox Text box parameters
     * @returns {Promise<APIResponse<boolean>>}
     */
    static insertText(textBox: Object): Promise<Object | undefined | null>;
    /**
     * Modifies lasso text box.
     * @param {TextBox} textBox Text box parameters
     * @returns {Promise<APIResponse<boolean>>}
     */
    static modifyLassoText(textBox: Object): Promise<APIResponse<boolean>>;
    /**
     * Inserts image.
     * @param {string} pngPath Path to the image file
     * @returns {Promise<APIResponse<boolean>>}
     */
    static insertImage(pngPath: string): Promise<Object | null | undefined>;
}
//# sourceMappingURL=PluginNoteAPI.d.ts.map