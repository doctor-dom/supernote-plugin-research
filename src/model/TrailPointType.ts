export interface TrailPointType {
  page:number;// Page number
  type:number;// Data type: 0=angle, 1=contour, 2=stroke sample, 3=stroke pressure, 4=eraser line, 5=write flag, 6=marker direction, 7=recognition data
  opType:number;// Operation: 0=get list size, 1=add, 2=get by index, 3=delete by index, 4=insert at index
  index:number[];// Point index. One value operates on a single point; two values operate on a range.
  subIndex:number[];// Contour points are a list of lists, so a sub-index is required.
}
