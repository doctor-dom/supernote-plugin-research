import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { APIResponse } from '../response/APIResponse';
import type {
  Link,
  TextBox,
  Title,
  Element,
  ElementType,
} from '../model/Element';
import type { LassoElementTypeNum } from '../model/lasso/LassoElementTypeNum';
import type { ModifyLassoTitle } from '../model/lasso/ModifyLassoTitle';
import type { LassoLink, ModifyLassoLink, TextLink } from '../model/LassoData';
import type { Template } from '../model/Template';
export interface Spec extends TurboModule {
  /**
   * Creates element.
   */
  createElement(type: number): Promise<Object | null | undefined>;

    /**
   * Recycles element.
   */
  recycleElement(uuid: string): void;

    /**
   * Clears element Cache.
   */
  clearElementCache(): void;

    /**
   * Operates on element Point Data.
   */
  opElementPointData(
    uuid: string,
    type: number,
    opType: number,
    index: number[],
    subIndex: number[],
    newValues: Object[]
  ): Promise<Object | null | undefined>;

    /**
   * Saves sticker By Lasso.
   */
  saveStickerByLasso(path: string): Promise<Object | null | undefined>;

    /**
   * Gets sticker Size.
   */
  getStickerSize(path: string): Promise<Object | null | undefined>;

  /// Generate sticker thumbnail
    /**
   * Generates sticker Thumbnail.
   */
  generateStickerThumbnail(
    stickerPath: string,
    thumbnailPath: string,
    size: { width: number; height: number }
  ): Promise<Object | null | undefined>;

    /**
   * Converts element to Sticker.
   */
  convertElement2Sticker(params: {
    machineType: number;
    elements: Object[];
    stickerPath: string;
  }): Promise<Object | null | undefined>;

    /**
   * Inserts sticker.
   */
  insertSticker(path: string): Promise<Object | null | undefined>;

    /**
   * Sets lasso Box State.
   */
  setLassoBoxState(state: number): Promise<Object | null | undefined>;

    /**
   * Gets lasso Rect.
   */
  getLassoRect(): Promise<Object | null | undefined>;

    /**
   * Updates lasso Rect.
   */
  updateLassoRect(rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }): Promise<Object | null | undefined>;

  /**
   * Set slider bar status
   * @param {boolean} status true: Slidable, false: Not slidable
   */
  setSlideBarStatus(status: boolean): Promise<boolean>;

    /**
   * Sets system Dormancy State.
   */
  setSystemDormancyState(enable: boolean): void;

    /**
   * Sets status Bar And Slide Bar State.
   */
  setStatusBarAndSlideBarState(isLock: boolean): void;

    /**
   * Saves current Note.
   */
  saveCurrentNote(): Promise<Object | null | undefined>;

    /**
   * Gets elements.
   */
  getElements(
    page: number,
    notePath: string
  ): Promise<Object | null | undefined>;

    /**
   * Invokes replace Elements.
   */
  replaceElements(
    notePath: string,
    page: number,
    elements: Object[]
  ): Promise<Object | null | undefined>;

    /**
   * Inserts elements.
   */
  insertElements(
    notePath: string,
    page: number,
    elements: Object[]
  ): Promise<Object | null | undefined>;

    /**
   * Updates elements.
   */
  modifyElements(
    notePath: string,
    page: number,
    elements: Object[]
  ): Promise<Object | null | undefined>;

    /**
   * Gets lasso Elements.
   */
  getLassoElements(): Promise<Object | null | undefined>;

    /**
   * Gets lasso Element Type Counts.
   */
  getLassoElementTypeCounts(): Promise<Object | null | undefined>;

    /**
   * Deletes lasso Elements.
   */
  deleteLassoElements(): Promise<Object | null | undefined>;

    /**
   * Gets layers.
   */
  getLayers(notePath: string, page: number): Promise<Object | null | undefined>;

    /**
   * Updates layers.
   */
  modifyLayers(
    notePath: string,
    page: number,
    layers: Object[]
  ): Promise<Object | null | undefined>;

    /**
   * Inserts layer.
   */
  insertLayer(
    notePath: string,
    page: number,
    layer: Object
  ): Promise<Object | null | undefined>;

    /**
   * Deletes layers.
   */
  deleteLayers(
    notePath: string,
    page: number,
    layerIds: number[]
  ): Promise<Object | null | undefined>;

    /**
   * Sorts layers.
   */
  sortLayers(
    notePath: string,
    page: number,
    layerIds: number[]
  ): Promise<Object | null | undefined>;

    /**
   * Gets lasso Link.
   */
  getLassoLink(): Promise<Object | null | undefined>;

    /**
   * Sets lasso Stroke Link.
   */
  setLassoStrokeLink(params: {
    destPath: string;
    destPage: number;
    style: number;
    linkType: number;
  }): Promise<Object | null | undefined>;

    /**
   * Inserts text Link.
   */
  insertTextLink(textLink: Object): Promise<Object | null | undefined>;

    /**
   * Updates lasso Link.
   */
  modifyLassoLink(modifyLink: Object): Promise<Object | null | undefined>;
    /**
   * Sets lasso Title.
   */
  setLassoTitle(params: { style: number }): Promise<Object | null | undefined>;

    /**
   * Gets titles.
   */
  getTitles(
    notePath: string,
    pageList: number[]
  ): Promise<Object | null | undefined>;

    /**
   * Gets lasso Title.
   */
  getLassoTitle(): Promise<Object | null | undefined>;

    /**
   * Updates lasso Title.
   */
  modifyLassoTitle(params: {
    style: number;
  }): Promise<Object | null | undefined>;

    /**
   * Gets key Words.
   */
  getKeyWords(
    notePath: string,
    pageList: number[]
  ): Promise<Object | null | undefined>;

    /**
   * Inserts key Word.
   */
  insertKeyWord(
    notePath: string,
    page: number,
    keyword: string
  ): Promise<Object | null | undefined>;

    /**
   * Deletes key Word.
   */
  deleteKeyWord(
    notePath: string,
    page: number,
    index: number
  ): Promise<Object | null | undefined>;

    /**
   * Gets lasso Text.
   */
  getLassoText(): Promise<Object | null | undefined>;

    /**
   * Inserts text.
   */
  insertText(textBox: Object): Promise<Object | null | undefined>;

    /**
   * Updates lasso Text.
   */
  modifyLassoText(textBox: Object): Promise<Object | null | undefined>;

    /**
   * Gets current Page Num.
   */
  getCurrentPageNum(): Promise<Object | null | undefined>;

    /**
   * Gets current File Path.
   */
  getCurrentFilePath(): Promise<Object | null | undefined>;

    /**
   * Reloads file.
   */
  reloadFile(): Promise<Object | null | undefined>;

    /**
   * Gets note Total Page Num.
   */
  getNoteTotalPageNum(notePath: string): Promise<Object | null | undefined>;

    /**
   * Gets lasso Geometries.
   */
  getLassoGeometries(): Promise<Object | null | undefined>;

    /**
   * Inserts geometry.
   */
  insertGeometry(geometry: Object): Promise<Object | null | undefined>;

    /**
   * Updates lasso Geometry.
   */
  modifyLassoGeometry(geometry: Object): Promise<Object | null | undefined>;

    /**
   * Clears layer Elements.
   */
  clearLayerElements(
    notePath: string,
    page: number,
    layer: number
  ): Promise<Object | null | undefined>;

    /**
   * Clears mark Elements.
   */
  clearMarkElements(
    filePath: string,
    page: number
  ): Promise<Object | null | undefined>;

    /**
   * Gets file Machine Type.
   */
  getFileMachineType(notePath: string): Promise<Object | null | undefined>;

    /**
   * Gets page Size.
   */
  getPageSize(
    notePath: string,
    page: number
  ): Promise<Object | null | undefined>;

    /**
   * Generates note Png.
   */
  generateNotePng(params: {
    notePath: string;
    page: number;
    times: number;
    pngPath: string;
    type: number;
  }): Promise<Object | null | undefined>;

  // Note file related APIs

    /**
   * Gets note System Templates.
   */
  getNoteSystemTemplates(): Promise<Object[] | null | undefined>;

    /**
   * Removes note Page.
   */
  removeNotePage(
    notePath: string,
    page: number
  ): Promise<Object | null | undefined>;

    /**
   * Inserts note Page.
   */
  insertNotePage(params: {
    notePath: string;
    page: number;
    template: string;
  }): Promise<Object | null | undefined>;

    /**
   * Creates note.
   */
  createNote(params: {
    notePath: string;
    template: string;
    mode: number;
    isPortrait: boolean;
  }): Promise<Object | null | undefined>;

    /**
   * Generates note Template Png.
   */
  generateNoteTemplatePng(
    notePath: string,
    page: number,
    pngPath: string
  ): Promise<Object | null | undefined>;

    /**
   * Gets note Page Template.
   */
  getNotePageTemplate(
    notePath: string,
    page: number
  ): Promise<Object | null | undefined>;

    /**
   * Generates mark Thumbnails.
   */
  generateMarkThumbnails(
    markPath: string,
    page: number,
    pngPath: string,
    size: { width: number; height: number }
  ): Promise<Object | null | undefined>;

    /**
   * Searches five Stars.
   */
  searchFiveStars(filePath: string): Promise<Object | null | undefined>;

    /**
   * Gets mark Pages.
   */
  getMarkPages(filePath: string): Promise<Object | null | undefined>;

    /**
   * Gets selected Text.
   */
  getSelectedText(): Promise<Object | null | undefined>;

    /**
   * Gets current Doc Text.
   */
  getCurrentDocText(page: number): Promise<Object | null | undefined>;

    /**
   * Gets current Doc Total Pages.
   */
  getCurrentDocTotalPages(): Promise<Object | null | undefined>;

    /**
   * Gets note Type.
   */
  getNoteType(notePath: string): Promise<Object | null | undefined>;

    /**
   * Gets element Counts.
   */
  getElementCounts(notePath:string, page:number): Promise<Object | null | undefined>;

    /**
   * Gets element Num List.
   */
  getElementNumList(notePath:string, page:number): Promise<Object | null | undefined>;

    /**
   * Gets element.
   */
  getElement(notePath:string, page:number, num:number): Promise<Object | null | undefined>;

    /**
   * Gets last Element.
   */
  getLastElement(): Promise<Object | null | undefined>;

  registerEventListener(event:string, registerType:number ):void;

  unregisterEventListener(event:string):void;

    /**
   * Inserts five Star.
   */
  insertFiveStar(starPoints:Object[] | null | undefined):Promise<Object | null | undefined>;

  /**
   * Inserts image.
   */
  insertImage(pngPath:string):Promise<Object | null | undefined>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativePluginAPI');
