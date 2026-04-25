"use strict";

import NativePluginAPI from '../module/NativePluginAPI';
import APIError from "../error/APIError.js";
import { verifyParams } from "./utils/VerifyUtils.js";
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
  static async getSelectedText() {
    return NativePluginAPI.getSelectedText();
  }

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
  static async getCurrentDocText(page) {
    try {
      verifyParams({
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        page
      }, {
        allowUnknown: false,
        rootName: 'getCurrentDocText'
      });
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 100,
            message: error.message
          }
        };
      }
    }
    return NativePluginAPI.getCurrentDocText(page);
  }

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
  static async getCurrentTotalPages() {
    return await NativePluginAPI.getCurrentDocTotalPages();
  }
}
//# sourceMappingURL=PluginDocAPI.js.map