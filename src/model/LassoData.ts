export class LassoLink {
  public category: number = 0; // Link category: 0=text link, 1=stroke link
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
  public style: number = 0;
  // public linkInout: number = 0; // Outbound/inbound
  /// Link type (must match the native mapping).
  /// 0: jump to note page
  /// 1: note file
  /// 2: document
  /// 3: image
  /// 4: URL
  /// 5: other
  /// 6: digest link (jumps to digest)
  public linkType: number = 0;
  // public linkTimestamp: string = "";
  public destPath: string = ""; // Outbound: target file full path; inbound: source file full path
  // public destFileId: string = ""; // Outbound: target file ID; inbound: source file ID
  // public destPageId: string = ""; // Outbound: target page ID; inbound: source page ID
  public destPage: number = 0; // Outbound: target page number; inbound: source page number

  // Text-link-only fields
  // public fontSize: number = 0; // Font size
  // public fontPath: string = ""; // Font path
  public fullText: string = ""; // Full text
  public showText: string = ""; // Display text

  public italic: number = 1; // 0: non-italic, 1: italic
}

export class ModifyLassoLink {
  public destPath: string = ''; // Target path
  public destPage: number = 0; // Target page
  public linkType: number = 0; // Link type
  public style: number = 0; // Link style
  public fullText: string|null = ''; // Full text
  public showText: string|null = ''; // Display text

}

export class TextLink {
  /** Target file path. If linkType is 4 (URL), set this to the URL. */
  public destPath: string = '';

  /** Target page number. If linkType is 4 (URL), page can be 0. */
  public destPage: number = 0;

  /**
   * Link style mapping.
   * 0: solid underline
   * 1: solid border
   * 2: dashed border
   */
  public style: number = 0;

  /**
   * Link type.
   * 0: jump to note page
   * 1: jump to note file
   * 2: document
   * 3: image
   * 4: URL
   */
  public linkType: number = 0;

  /** Text box region (pixel coordinates), as {left, top, right, bottom}. */
  public rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } = { left: 0, top: 0, right: 0, bottom: 0 };

  /** Font size. */
  public fontSize: number = 12;

  /** Full text content. */
  public fullText: string = '';

  /** Display text content. */
  public showText: string = '';

  /** Italic flag: 0 = no, 1 = yes. */
  public isItalic: number = 0;
}
