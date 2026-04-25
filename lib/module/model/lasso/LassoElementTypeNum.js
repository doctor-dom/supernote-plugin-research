"use strict";

/**
 * Counts of lasso element types.
 */
export class LassoElementTypeNum {
  trailLinkNum = 0; // Stroke links
  textLinkNum = 0; // Plain text links (also includes pnglinknum; early pnglinknum represents text rendered as an image and is not editable)
  todoLinkNum = 0; // TODO links
  titleNum = 0; // Titles
  bitmapNum = 0; // Images
  normalTextBoxNum = 0; // Text boxes
  digestTextBoxNum = 0; // Digest text boxes (non-editable)
  digestTextBoxEditableNum = 0; // Digest text boxes (editable)
  geometryNum = 0; // Total geometries (polygon/line/curve/circle/ellipse)
  straightLineNum = 0; // Straight lines
  circleNum = 0; // Circles
  ellipseNum = 0; // Ellipses
  trailNum = 0; // Regular strokes
}
//# sourceMappingURL=LassoElementTypeNum.js.map