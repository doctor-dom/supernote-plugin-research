"use strict";

// @ts-ignore Ignore type-checking: NativePluginManager currently has no type declarations.
import NativePluginManager from './module/NativePluginManager';

// @ts-ignore Ignore type-checking: PluginManager currently has no type declarations.
import PluginManager from "./PluginManager.js";
import RattaFileSelector from './module/NativeFileSelector';
import FileUtils from './module/NativeFileUtils';
import NativeUIUtils from './module/NativeUIUtils';
import PointUtils from "./utils/PointUtils.js";
import PluginCommAPI from "./sdk/PluginCommAPI.js";
import PluginNoteAPI from "./sdk/PluginNoteAPI.js";
import PluginDocAPI from "./sdk/PluginDocAPI.js";
import PluginFileAPI from "./sdk/PluginFileAPI.js";
import { ElementPointDataType, ElementPointOperationType, ElementDataAccessor, Element,
// Additional exports - data types
RecogResultData, Link, Title, TextBox, Stroke, Geometry, RecognData } from "./model/Element.js";
export {
// Existing exports
PluginManager, NativePluginManager, PluginCommAPI, PluginNoteAPI, PluginDocAPI, PluginFileAPI, RattaFileSelector, FileUtils, NativeUIUtils, PointUtils,
// Additional exports - enums
ElementPointDataType, ElementPointOperationType,
// Additional exports - core types
ElementDataAccessor, Element,
// Additional exports - data types
RecogResultData, Link, Title, TextBox, Stroke, Geometry, RecognData };
//# sourceMappingURL=index.js.map