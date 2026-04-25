/**
 * Counts of lasso element types.
 */
export class LassoElementTypeNum {
  public trailLinkNum: number = 0; // Stroke links
  public textLinkNum: number = 0; // Plain text links (also includes pnglinknum; early pnglinknum represents text rendered as an image and is not editable)
  public todoLinkNum: number = 0; // TODO links
  public titleNum: number = 0; // Titles
  public bitmapNum: number = 0; // Images
  public normalTextBoxNum: number = 0; // Text boxes
  public digestTextBoxNum: number = 0; // Digest text boxes (non-editable)
  public digestTextBoxEditableNum: number = 0; // Digest text boxes (editable)
  public geometryNum: number = 0; // Total geometries (polygon/line/curve/circle/ellipse)
  public straightLineNum: number = 0; // Straight lines
  public circleNum: number = 0; // Circles
  public ellipseNum: number = 0; // Ellipses
  public trailNum: number = 0; // Regular strokes
}
