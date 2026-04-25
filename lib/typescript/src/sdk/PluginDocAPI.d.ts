export default class PluginDocAPI {
    /**
     * Gets the selected text.
     * @returns {Promise<APIResponse<string>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: string   // Selected text from the current file
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static getSelectedText(): Promise<Object | null | undefined>;
    /**
     * Gets the text content of a page in the currently opened document.
     * @param {number} page Page index
     * @returns {Promise<APIResponse<string>>} Returns:
     * {
     *  success: boolean  // Whether the API call succeeded
     *  result: string   // Text content of the specified document page
     *  error: { // Present only when success is false
     *    code: number  // Error code
     *    message: string  // Error message
     *  }
     * }
     */
    static getCurrentDocText(page: number): Promise<Object | null | undefined>;
    /**
 * Gets total page count of the currently opened document.
 * @returns {Promise<APIResponse<number>>} Returns:
 * {
 *  success: boolean  // Whether the API call succeeded
 *  result: number   // Total page count of the document
 *  error: { // Present only when success is false
 *    code: number  // Error code
 *    message: string  // Error message
 *  }
 * }
 */
    static getCurrentTotalPages(): Promise<Object | null | undefined>;
}
//# sourceMappingURL=PluginDocAPI.d.ts.map