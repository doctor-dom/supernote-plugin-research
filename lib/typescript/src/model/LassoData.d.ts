export declare class LassoLink {
    category: number;
    /**
      * Link style mapping.
      * 0: solid underline
      * 1: solid border
      * 2: dashed border
      */
    style: number;
    linkType: number;
    destPath: string;
    destPage: number;
    fullText: string;
    showText: string;
    italic: number;
}
export declare class ModifyLassoLink {
    destPath: string;
    destPage: number;
    linkType: number;
    style: number;
    fullText: string | null;
    showText: string | null;
}
export declare class TextLink {
    /** Target file path. If linkType is 4 (URL), set this to the URL. */
    destPath: string;
    /** Target page number. If linkType is 4 (URL), page can be 0. */
    destPage: number;
    /**
     * Link style mapping.
     * 0: solid underline
     * 1: solid border
     * 2: dashed border
     */
    style: number;
    /**
     * Link type.
     * 0: jump to note page
     * 1: jump to note file
     * 2: document
     * 3: image
     * 4: URL
     */
    linkType: number;
    /** Text box region (pixel coordinates), as {left, top, right, bottom}. */
    rect: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /** Font size. */
    fontSize: number;
    /** Full text content. */
    fullText: string;
    /** Display text content. */
    showText: string;
    /** Italic flag: 0 = no, 1 = yes. */
    isItalic: number;
}
//# sourceMappingURL=LassoData.d.ts.map