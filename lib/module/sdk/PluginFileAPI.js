"use strict";

import APIError from "../error/APIError.js";
import { transformElements, transformElement } from "../model/Element.js";
import NativePluginAPI from "../module/NativePluginAPI";
import { verifyParams, SizeSchema, LayerSchema, ElementSchema } from "./utils/VerifyUtils.js";
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
  static async getElements(page, notePath) {
    try {
      verifyParams({
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        page,
        notePath
      }, {
        allowUnknown: false,
        rootName: 'getElements'
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
    const response = await NativePluginAPI.getElements(page, notePath);
    if (response.success) {
      transformElements(response.result);
      return response;
    }
    return response;
  }

  /**
   * Replaces all elements on a page.
   * @param {string} notePath Note file path
   * @param {number} page Page index
   * @param {Element[]} elements Element list
   * @returns {Promise<APIResponse<boolean>>} Replacement result
   */
  static async replaceElements(notePath, page, elements) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        elements: {
          type: 'array',
          required: true,
          items: ElementSchema
        }
      }, {
        notePath,
        page,
        elements
      }, {
        allowUnknown: true,
        rootName: 'replaceElements'
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
    return await NativePluginAPI.replaceElements(notePath, page, elements);
  }

  /**
   * Inserts elements into a page.
   * @param {string} notePath Note file path
   * @param {number} page Page index
   * @param {Element[]} elements Element list
   * @returns {Promise<APIResponse<boolean>>} Insert result
   */
  static async insertElements(notePath, page, elements) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        elements: {
          type: 'array',
          required: true,
          items: ElementSchema
        }
      }, {
        notePath,
        page,
        elements
      }, {
        allowUnknown: true,
        rootName: 'insertElements'
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
    return await NativePluginAPI.insertElements(notePath, page, elements);
  }

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
  static async modifyElements(notePath, page, elements) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        elements: {
          type: 'array',
          required: true,
          items: ElementSchema
        }
      }, {
        notePath,
        page,
        elements
      }, {
        allowUnknown: true,
        rootName: 'modifyElements'
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
    return await NativePluginAPI.modifyElements(notePath, page, elements);
  }

  /**
      * Gets title data.
      * @param {string} notePath Note file path
      * @param {number[]} pageList Page list
      * @returns {Promise<APIResponse<Title[]>>}
      */
  static async getTitles(notePath, pageList) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        pageList: {
          type: 'array',
          required: true,
          items: {
            type: 'number',
            required: true,
            integer: true,
            min: 0
          }
        }
      }, {
        notePath,
        pageList
      }, {
        allowUnknown: false,
        rootName: 'getTitles'
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
    return await NativePluginAPI.getTitles(notePath, pageList);
  }

  /**
   * Gets keywords.
   * @param {string} notePath Note file path
   * @param {number[]} pageList Page list
   * @returns {Promise<APIResponse<KeyWord[]>>}
   */
  static async getKeyWords(notePath, pageList) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        pageList: {
          type: 'array',
          required: true,
          items: {
            type: 'number',
            required: true,
            integer: true,
            min: 0
          }
        }
      }, {
        notePath,
        pageList
      }, {
        allowUnknown: false,
        rootName: 'getKeyWords'
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
    return await NativePluginAPI.getKeyWords(notePath, pageList);
  }

  /**
   * Inserts a keyword.
   * @param {string} notePath Note file path
   * @param {number} page Page index
   * @param {string} keyword Keyword
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async insertKeyWord(notePath, page, keyword) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        keyword: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        notePath,
        page,
        keyword
      }, {
        allowUnknown: false,
        rootName: 'insertKeyWord'
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
            code: 1007,
            message: error.message
          }
        };
      }
    }
    return await NativePluginAPI.insertKeyWord(notePath, page, keyword);
  }

  /**
   * Deletes a keyword.
   * @param {string} notePath Note file path
   * @param {number} page Page index where the keyword is located
   * @param {number} index Keyword index within the specified page
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async deleteKeyWord(notePath, page, index) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        index: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page,
        index
      }, {
        allowUnknown: false,
        rootName: 'deleteKeyWord'
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
    return await NativePluginAPI.deleteKeyWord(notePath, page, index);
  }

  /**
    * Gets total page count of a note file.
    * @param {string} notePath Note file path
    * @returns {Promise<APIResponse<number>>}
    */
  static async getNoteTotalPageNum(notePath) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        notePath
      }, {
        allowUnknown: false,
        rootName: 'getNoteTotalPageNum'
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
    return await NativePluginAPI.getNoteTotalPageNum(notePath);
  }

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
  static async getFileMachineType(notePath) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        notePath
      }, {
        allowUnknown: false,
        rootName: 'getFileMachineType'
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
    return await NativePluginAPI.getFileMachineType(notePath);
  }

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
  /* static async getPageRotationType(notePath: string, page: number): Promise<Object | null | undefined> {
    try {
      verifyParams(
        {
          notePath: { type: 'string', required: true, nonEmpty: true },
          page: { type: 'number', required: true, integer: true, min: 0 },
        },
        { notePath, page },
        { allowUnknown: false, rootName: 'getPageRotationType' }
      );
    } catch (error) {
      if (APIError.isAPIError(error)) {
        return { success: false, error: { code: error.code, message: error.message } };
      } else {
        return { success: false, error: { code: 100, message: (error as Error).message } };
      }
    }
    return await NativePluginAPI.getPageRotationType(notePath, page);
  } */

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
  static async getPageSize(notePath, page) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page
      }, {
        allowUnknown: false,
        rootName: 'getPageSize'
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
    return await NativePluginAPI.getPageSize(notePath, page);
  }

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
  static async generateNotePng(params) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        times: {
          type: 'number',
          required: true,
          integer: true
        },
        pngPath: {
          type: 'string',
          required: true,
          nonEmpty: true,
          pattern: /\.png$/i
        },
        type: {
          type: 'number',
          required: true,
          integer: true
        }
      }, params, {
        allowUnknown: false,
        rootName: 'generateNotePng'
      });
    } catch (error) {
      console.error('generateNotePng: verify error:', error);
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
            code: 107,
            message: error.message
          }
        };
      }
    }
    try {
      return await NativePluginAPI.generateNotePng(params);
    } catch (error) {
      console.error('generateNotePng: Native module error:', error);
      return {
        success: false,
        error: {
          code: 107,
          message: `Native module error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

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
  static async searchFiveStars(filePath) {
    try {
      verifyParams({
        filePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        filePath
      }, {
        allowUnknown: false,
        rootName: 'searchFiveStars'
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
    return NativePluginAPI.searchFiveStars(filePath);
  }

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
  static async createNote(params) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        template: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        mode: {
          type: 'number',
          required: true,
          integer: true
        },
        isPortrait: {
          type: 'boolean',
          required: true
        }
      }, params, {
        allowUnknown: false,
        rootName: 'createNote'
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
            code: 107,
            message: error.message
          }
        };
      }
    }
    return await NativePluginAPI.createNote(params);
  }

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
  static async removeNotePage(notePath, page) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page
      }, {
        allowUnknown: false,
        rootName: 'removeNotePage'
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
    return await NativePluginAPI.removeNotePage(notePath, page);
  }

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
  static async insertNotePage(params) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        template: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, params, {
        allowUnknown: false,
        rootName: 'insertNotePage'
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
    return await NativePluginAPI.insertNotePage(params);
  }

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
  static async clearLayerElements(notePath, page, layer) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        layer: {
          type: 'number',
          required: true,
          integer: true
        }
      }, {
        notePath,
        page,
        layer
      }, {
        allowUnknown: false,
        rootName: 'clearLayerElements'
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
    return await NativePluginAPI.clearLayerElements(notePath, page, layer);
  }

  /**
      * Gets page layer data.
      * @param {string} notePath Note file path
      * @param {number} page Page index
      * @returns {Promise<APIResponse<Layer[]>>} Layer list
      */
  static async getLayers(notePath, page) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page
      }, {
        allowUnknown: false,
        rootName: 'getLayers'
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
    return await NativePluginAPI.getLayers(notePath, page);
  }

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
  static async modifyLayers(notePath, page, layers) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        layers: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            required: true,
            properties: LayerSchema
          }
        }
      }, {
        notePath,
        page,
        layers
      }, {
        allowUnknown: true,
        rootName: 'modifyLayers'
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
    return await NativePluginAPI.modifyLayers(notePath, page, layers);
  }

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
  static async insertLayer(notePath, page, layer) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        layer: {
          type: 'object',
          required: true,
          properties: LayerSchema
        }
      }, {
        notePath,
        page,
        layer
      }, {
        allowUnknown: true,
        rootName: 'insertLayer'
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
    return await NativePluginAPI.insertLayer(notePath, page, layer);
  }

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
  static async deleteLayers(notePath, page, layerIds) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        layerIds: {
          type: 'array',
          required: true,
          items: {
            type: 'number',
            required: true,
            integer: true
          }
        }
      }, {
        notePath,
        page,
        layerIds
      }, {
        allowUnknown: false,
        rootName: 'deleteLayers'
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
    return await NativePluginAPI.deleteLayers(notePath, page, layerIds);
  }

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
  static async sortLayers(notePath, page, layerIds) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        layerIds: {
          type: 'array',
          required: true,
          items: {
            type: 'number',
            required: true,
            integer: true
          }
        }
      }, {
        notePath,
        page,
        layerIds
      }, {
        allowUnknown: false,
        rootName: 'sortLayers'
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
    return await NativePluginAPI.sortLayers(notePath, page, layerIds);
  }

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
  static async getMarkPages(filePath) {
    try {
      verifyParams({
        filePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        filePath
      }, {
        allowUnknown: false,
        rootName: 'getMarkPages'
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
    return NativePluginAPI.getMarkPages(filePath);
  }

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
  static async generateMarkThumbnails(markPath, page, pngPath, size) {
    try {
      verifyParams({
        markPath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        pngPath: {
          type: 'string',
          required: true,
          nonEmpty: true,
          pattern: /\.png$/i
        },
        size: {
          type: 'object',
          required: true,
          properties: SizeSchema
        }
      }, {
        markPath,
        page,
        pngPath,
        size
      }, {
        allowUnknown: false,
        rootName: 'generateMarkThumbnails'
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
    return NativePluginAPI.generateMarkThumbnails(markPath, page, pngPath, size);
  }

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
  static async clearMarkElements(filePath, page) {
    try {
      verifyParams({
        filePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        filePath,
        page
      }, {
        allowUnknown: false,
        rootName: 'clearMarkElements'
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
    return await NativePluginAPI.clearMarkElements(filePath, page);
  }

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
  static async getNotePageTemplate(notePath, page) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page
      }, {
        allowUnknown: false,
        rootName: 'getNotePageTemplate'
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
    return await NativePluginAPI.getNotePageTemplate(notePath, page);
  }

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
  static async generateNoteTemplatePng(notePath, page, pngPath) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        pngPath: {
          type: 'string',
          required: true,
          nonEmpty: true,
          pattern: /\.png$/i
        }
      }, {
        notePath,
        page,
        pngPath
      }, {
        allowUnknown: false,
        rootName: 'generateNoteTemplatePng'
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
    return await NativePluginAPI.generateNoteTemplatePng(notePath, page, pngPath);
  }

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
  static async getNoteType(notePath) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        notePath
      }, {
        allowUnknown: false,
        rootName: 'getNoteType'
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
    return await NativePluginAPI.getNoteType(notePath);
  }

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
  static async getElementCounts(notePath, page) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page
      }, {
        allowUnknown: false,
        rootName: 'getElementCounts'
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
    return await NativePluginAPI.getElementCounts(notePath, page);
  }

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
  static async getElementNumList(notePath, page) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page
      }, {
        allowUnknown: false,
        rootName: 'getElementNumList'
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
    return await NativePluginAPI.getElementNumList(notePath, page);
  }

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
  static async getElement(notePath, page, num) {
    try {
      verifyParams({
        notePath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        page: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        },
        num: {
          type: 'number',
          required: true,
          integer: true,
          min: 0
        }
      }, {
        notePath,
        page,
        num
      }, {
        allowUnknown: false,
        rootName: 'getElement'
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
    const response = await NativePluginAPI.getElement(notePath, page, num);
    if (response.success && response.result != null) {
      transformElement(response.result);
      return response;
    }
    return response;
  }

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
  static async getLastElement() {
    const response = await NativePluginAPI.getLastElement();
    if (response.success && response.result != null) {
      transformElement(response.result);
      return response;
    }
    return response;
  }
}
//# sourceMappingURL=PluginFileAPI.js.map