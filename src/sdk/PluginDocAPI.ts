import NativePluginAPI from '../module/NativePluginAPI';
import { APIResponse } from '../response/APIResponse';
import APIError from '../error/APIError';
import { verifyParams } from './utils/VerifyUtils';


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
  static async getSelectedText(): Promise<Object | null | undefined> {
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
  static async getCurrentDocText(page:number): Promise<Object | null | undefined> {
    try {
      verifyParams(
        { page: { type: 'number', required: true, integer: true, min: 0 } },
        { page },
        { allowUnknown: false, rootName: 'getCurrentDocText' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } };
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } };
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
  static async getCurrentTotalPages(): Promise<Object | null | undefined> {
    return await NativePluginAPI.getCurrentDocTotalPages() as Object | null | undefined;
  }



}
