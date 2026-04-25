"use strict";

var AppType = /*#__PURE__*/function (AppType) {
  AppType["Note"] = "NOTE";
  AppType["Doc"] = "DOC";
  return AppType;
}(AppType || {});
class PluginButton {
  id = 0;
  name = '';
  icon = '';
  enable = false;
}
class PluginEditButton extends PluginButton {
  /**
   * Edit data types
   * 0: Handwritten strokes
   * 1: Title
   * 2: Image
   * 3: Text
   * 4: Link
   * 5: Geometric shapes
   */
  editDataTypes = [];
}
class PluginSideButton extends PluginButton {
  /**
   * Expand button type
   * 0: Default value, no button extension, adds an entry to sidebar
   * 1: Pen
   * 2: Eraser
   * 3: Layer
   * 4: Template
   * 5: Thumbnail
   */
  expandButton = 0;
}
export { PluginEditButton, PluginSideButton, PluginButton, AppType };
//# sourceMappingURL=PluginButton.js.map