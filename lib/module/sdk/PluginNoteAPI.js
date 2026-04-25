"use strict";

import NativePluginAPI from "../module/NativePluginAPI";
import APIError from "../error/APIError.js";
import { verifyParams, RectSchema } from "./utils/VerifyUtils.js";

/**
 * Validates TextLink parameters.
 * - Rejects null/undefined
 * - Validates field types and value ranges
 * - Throws APIError on invalid input (see PluginCommAPI.ts for error handling patterns)
 */
const verifyTextLink = link => {
  if (link == null) {
    throw new APIError(501, 'TextLink object cannot be null or undefined');
  }
  try {
    verifyModifyLassoLink(link);
  } catch (error) {
    throw error;
  }
  const {
    rect,
    fontSize,
    isItalic
  } = link;
  if (!rect || typeof rect !== 'object') {
    throw new APIError(107, 'rect must be a valid object');
  }
  const {
    left,
    top,
    right,
    bottom
  } = rect;
  if ([left, top, right, bottom].some(v => typeof v !== 'number') || right - left <= 0 || bottom - top <= 0) {
    throw new APIError(107, 'rect must be a non-zero-area rectangle');
  }
  if (typeof fontSize !== 'number' || fontSize <= 0) {
    throw new APIError(107, 'fontSize must be a positive number');
  }
  if (typeof isItalic !== 'number' || !Number.isInteger(isItalic) || isItalic !== 0 && isItalic !== 1) {
    throw new APIError(107, 'isItalic must be 0 or 1');
  }
};
const verifyModifyLassoLink = link => {
  if (link == null) {
    throw new APIError(501, 'ModifyLassoLink object cannot be null or undefined');
  }
  const {
    destPath,
    destPage,
    style,
    linkType,
    fullText,
    showText
  } = link;
  if (typeof linkType !== 'number' || !Number.isInteger(linkType) || linkType < 0 || linkType > 4) {
    throw new APIError(506, 'Invalid linkType. Please set it again.');
  }
  if (typeof style !== 'number' || !Number.isInteger(style) || style !== 0 && style !== 1 && style !== 2) {
    throw new APIError(507, 'Invalid link style. Please set it again.');
  }
  if (typeof destPath !== 'string' || destPath.trim().length === 0) {
    throw new APIError(112, 'destPath must be a non-empty string');
  }

  // destPage is only applicable when linkType is 0
  if (linkType === 0 && (typeof destPage !== 'number' || !Number.isInteger(destPage) || destPage < 0)) {
    throw new APIError(107, 'destPage must be a non-negative integer');
  }
  if (typeof fullText !== 'string') {
    throw new APIError(107, 'fullText must be a string');
  }
  if (typeof showText !== 'string') {
    throw new APIError(107, 'showText must be a string');
  }
};
const verifyTextBox = textBox => {
  if (!textBox?.textContentFull) {
    throw new APIError(3001, 'Text box content cannot be empty');
  }
  let rect = textBox?.textRect;
  if (!rect) {
    throw new APIError(3002, 'Text box rectangle cannot be empty');
  }
  if (rect.right - rect.left <= 0 || rect.bottom - rect.top <= 0) {
    throw new APIError(3002, 'Text box rectangle must be a non-zero-area rectangle');
  }
};
export default class PluginNoteAPI {
  /**
     * Gets lasso link data.
     * @returns {Promise<APIResponse<LassoLink>>} Lasso links
     */
  static async getLassoLinks() {
    return await NativePluginAPI.getLassoLink();
  }

  /**
   * Sets the lasso-selected strokes as a link.
   * @param {string} params.destPath Destination file path. When linkType is 3 (url), this should be the URL.
   * @param {number} params.destPage Destination page index
   * @param {number} params.style Link style: 0=solid underline, 1=solid border, 2=dashed border
   * @param {number} params.linkType Link type: 0=note page, 1=note file, 2=document, 3=image, 4=website
   * @returns {Promise<APIResponse<number>>} Result code: 0=success, -1=failure, -2=destination needs upgrade
   */
  static async setLassoStrokeLink(params) {
    try {
      verifyParams({
        destPath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        destPage: {
          type: 'number',
          integer: true
        },
        style: {
          type: 'number',
          required: true,
          integer: true
        },
        linkType: {
          type: 'number',
          required: true,
          integer: true
        }
      }, params, {
        allowUnknown: true,
        rootName: 'setLassoStrokeLink'
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
    try {
      return await NativePluginAPI.setLassoStrokeLink(params);
    } catch (error) {
      // Exception handling
      console.error('setLassoStrokeLink error:', error);
      throw error;
    }
  }

  /**
   * Inserts a text link.
   * @param {TextLink} textLink Text link data. See {@link TextLink} for editable fields.
   * @returns {Promise<APIResponse<number>>}
   */
  static async insertTextLink(textLink) {
    try {
      verifyParams({
        destPath: {
          type: 'string',
          required: true,
          nonEmpty: true
        },
        destPage: {
          type: 'number',
          integer: true
        },
        style: {
          type: 'number',
          required: true,
          integer: true
        },
        linkType: {
          type: 'number',
          required: true,
          integer: true
        },
        rect: {
          type: 'object',
          required: true,
          properties: RectSchema,
          custom: (v, p) => {
            const {
              left,
              top,
              right,
              bottom
            } = v || {};
            if ([left, top, right, bottom].some(n => typeof n !== 'number') || right - left <= 0 || bottom - top <= 0) {
              throw new APIError(107, `${p} must be a non-zero-area rectangle`);
            }
          }
        },
        fontSize: {
          type: 'number',
          required: true,
          min: 1
        },
        fullText: {
          type: 'string',
          required: true
        },
        showText: {
          type: 'string',
          required: true
        },
        isItalic: {
          type: 'number',
          required: true,
          integer: true
        }
      }, textLink, {
        allowUnknown: true,
        rootName: 'insertTextLink'
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
    return await NativePluginAPI.insertTextLink(textLink);
  }

  /**
   * Modifies link data.
   * @param {ModifyLassoLink} modifyLink Link data
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async modifyLassoLink(modifyLink) {
    try {
      verifyParams({
        modifyLink: {
          type: 'object',
          required: true,
          properties: {
            destPath: {
              type: 'string',
              required: true,
              nonEmpty: true
            },
            destPage: {
              type: 'number',
              integer: true
            },
            linkType: {
              type: 'number',
              required: true,
              integer: true
            },
            style: {
              type: 'number',
              required: true,
              integer: true
            },
            fullText: {
              type: 'string'
            },
            showText: {
              type: 'string'
            }
          },
          custom: (val, path) => {
            if (val?.linkType === 0) {
              if (val?.destPage == null || !Number.isInteger(val.destPage) || val.destPage < 0) {
                throw new APIError(107, `${path}.destPage must be a non-negative integer (required when linkType=0)`);
              }
            }
          }
        }
      }, {
        modifyLink
      }, {
        allowUnknown: true,
        rootName: 'modifyLassoLink'
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
    return await NativePluginAPI.modifyLassoLink(modifyLink);
  }

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
  static async saveCurrentNote() {
    return await NativePluginAPI.saveCurrentNote();
  }

  /**
    * Sets lasso strokes as a title, or modifies current lasso title parameters.
   * @param {number} params.style Title style: 0=remove title, 1=black background, 2=light gray, 3=dark gray, 4=shadow
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async setLassoTitle(params) {
    try {
      verifyParams({
        style: {
          type: 'number',
          required: true,
          integer: true
        }
      }, params, {
        allowUnknown: true,
        rootName: 'setLassoTitle'
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
    return await NativePluginAPI.setLassoTitle(params);
  }

  /**
   * Gets lasso titles.
   * @returns {Promise<APIResponse<Title>>}
   */
  static async getLassoTitles() {
    return await NativePluginAPI.getLassoTitle();
  }

  /**
   * Modifies lasso title.
   * @param {number} style Title style: 0=remove title, 1=black background, 2=light gray, 3=dark gray, 4=shadow
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async modifyLassoTitle(params) {
    try {
      verifyParams({
        style: {
          type: 'number',
          required: true,
          integer: true
        }
      }, params, {
        allowUnknown: true,
        rootName: 'modifyLassoTitle'
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
    return await NativePluginAPI.modifyLassoTitle(params);
  }

  /**
    * Gets lasso text boxes.
    * @returns {Promise<APIResponse<TextBox[]>>}
    */
  static async getLassoText() {
    return await NativePluginAPI.getLassoText();
  }

  /**
   * Inserts a text box.
   * @param {TextBox} textBox Text box parameters
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async insertText(textBox) {
    try {
      verifyParams({
        textBox: {
          type: 'object',
          required: true,
          properties: {
            fontSize: {
              type: 'number',
              min: 1
            },
            fontPath: {
              type: 'string'
            },
            textContentFull: {
              type: 'string',
              required: true,
              nonEmpty: true
            },
            textRect: {
              type: 'object',
              required: true,
              properties: RectSchema,
              custom: (v, p) => {
                const {
                  left,
                  top,
                  right,
                  bottom
                } = v || {};
                if ([left, top, right, bottom].some(n => typeof n !== 'number') || right - left <= 0 || bottom - top <= 0) {
                  throw new APIError(107, `${p} must be a non-zero-area rectangle`);
                }
              }
            },
            textDigestData: {
              type: 'string'
            },
            textAlign: {
              type: 'number',
              integer: true
            },
            textBold: {
              type: 'number',
              integer: true
            },
            textItalics: {
              type: 'number',
              integer: true
            },
            textFrameWidthType: {
              type: 'number',
              integer: true
            },
            textFrameWidth: {
              type: 'number',
              integer: true
            },
            textFrameStyle: {
              type: 'number',
              integer: true
            },
            textEditable: {
              type: 'number',
              integer: true
            }
          }
        }
      }, {
        textBox
      }, {
        allowUnknown: true,
        rootName: 'insertText'
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
    return await NativePluginAPI.insertText(textBox);
  }

  /**
   * Modifies lasso text box.
   * @param {TextBox} textBox Text box parameters
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async modifyLassoText(textBox) {
    try {
      verifyParams({
        textBox: {
          type: 'object',
          required: true,
          properties: {
            fontSize: {
              type: 'number',
              min: 1
            },
            fontPath: {
              type: 'string'
            },
            textContentFull: {
              type: 'string',
              required: true,
              nonEmpty: true
            },
            textRect: {
              type: 'object',
              required: true,
              properties: RectSchema,
              custom: (v, p) => {
                const {
                  left,
                  top,
                  right,
                  bottom
                } = v || {};
                if ([left, top, right, bottom].some(n => typeof n !== 'number') || right - left <= 0 || bottom - top <= 0) {
                  throw new APIError(107, `${p} must be a non-zero-area rectangle`);
                }
              }
            },
            textDigestData: {
              type: 'string'
            },
            textAlign: {
              type: 'number',
              integer: true
            },
            textBold: {
              type: 'number',
              integer: true
            },
            textItalics: {
              type: 'number',
              integer: true
            },
            textFrameWidthType: {
              type: 'number',
              integer: true
            },
            textFrameWidth: {
              type: 'number',
              integer: true
            },
            textFrameStyle: {
              type: 'number',
              integer: true
            },
            textEditable: {
              type: 'number',
              integer: true
            }
          }
        }
      }, {
        textBox
      }, {
        allowUnknown: true,
        rootName: 'modifyLassoText'
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
    return await NativePluginAPI.modifyLassoText(textBox);
  }

  /**
   * Inserts image.
   * @param {string} pngPath Path to the image file
   * @returns {Promise<APIResponse<boolean>>}
   */
  static async insertImage(pngPath) {
    try {
      verifyParams({
        pngPath: {
          type: 'string',
          required: true,
          nonEmpty: true
        }
      }, {
        pngPath
      }, {
        allowUnknown: true,
        rootName: 'insertImage'
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
    return await NativePluginAPI.insertImage(pngPath);
  }
}
//# sourceMappingURL=PluginNoteAPI.js.map