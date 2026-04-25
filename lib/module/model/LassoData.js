"use strict";

export class LassoLink {
  category = 0; // Link category: 0=text link, 1=stroke link
  // public page: number = 0; // Unused
  // public num: number = 0; // Index within the page
  // public index: number = 0; // Export: global link index
  // public pageSeq: number = 0; // Page sequence
  /**
    * Link style mapping.
    * 0: solid underline
    * 1: solid border
    * 2: dashed border
    */
  style = 0;
  // public linkInout: number = 0; // Outbound/inbound
  /// Link type (must match the native mapping).
  /// 0: jump to note page
  /// 1: note file
  /// 2: document
  /// 3: image
  /// 4: URL
  /// 5: other
  /// 6: digest link (jumps to digest)
  linkType = 0;
  // public linkTimestamp: string = "";
  destPath = ""; // Outbound: target file full path; inbound: source file full path
  // public destFileId: string = ""; // Outbound: target file ID; inbound: source file ID
  // public destPageId: string = ""; // Outbound: target page ID; inbound: source page ID
  destPage = 0; // Outbound: target page number; inbound: source page number

  // Text-link-only fields
  // public fontSize: number = 0; // Font size
  // public fontPath: string = ""; // Font path
  fullText = ""; // Full text
  showText = ""; // Display text

  italic = 1; // 0: non-italic, 1: italic
}
export class ModifyLassoLink {
  destPath = ''; // Target path
  destPage = 0; // Target page
  linkType = 0; // Link type
  style = 0; // Link style
  fullText = ''; // Full text
  showText = ''; // Display text
}
export class TextLink {
  /** Target file path. If linkType is 4 (URL), set this to the URL. */
  destPath = '';

  /** Target page number. If linkType is 4 (URL), page can be 0. */
  destPage = 0;

  /**
   * Link style mapping.
   * 0: solid underline
   * 1: solid border
   * 2: dashed border
   */
  style = 0;

  /**
   * Link type.
   * 0: jump to note page
   * 1: jump to note file
   * 2: document
   * 3: image
   * 4: URL
   */
  linkType = 0;

  /** Text box region (pixel coordinates), as {left, top, right, bottom}. */
  rect = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  };

  /** Font size. */
  fontSize = 12;

  /** Full text content. */
  fullText = '';

  /** Display text content. */
  showText = '';

  /** Italic flag: 0 = no, 1 = yes. */
  isItalic = 0;
}
//# sourceMappingURL=LassoData.js.map