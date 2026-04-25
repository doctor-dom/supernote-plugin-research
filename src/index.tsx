// @ts-ignore Ignore type-checking: NativePluginManager currently has no type declarations.
import NativePluginManager from './module/NativePluginManager';

// @ts-ignore Ignore type-checking: PluginManager currently has no type declarations.
import PluginManager from './PluginManager';



import RattaFileSelector from './module/NativeFileSelector';
import FileUtils from './module/NativeFileUtils';
import NativeUIUtils from './module/NativeUIUtils';
import PointUtils from './utils/PointUtils';
import  PluginCommAPI from './sdk/PluginCommAPI';
import PluginNoteAPI from './sdk/PluginNoteAPI';
import PluginDocAPI from './sdk/PluginDocAPI';
import PluginFileAPI from './sdk/PluginFileAPI';
import  { ElementPointDataType, ElementPointOperationType ,ElementDataAccessor,
 Element,

type Point, type PointF,type Rect,


  // Additional exports - data types
  RecogResultData,
  Link,
  Title,
  TextBox,
  Stroke,
  Geometry,
  RecognData
} from './model/Element';


export {
  // Existing exports
  PluginManager,
  NativePluginManager,
  PluginCommAPI,
  PluginNoteAPI,
  PluginDocAPI,
  PluginFileAPI,
  RattaFileSelector,
  FileUtils,
  NativeUIUtils,
  PointUtils,

  // Additional exports - enums
  ElementPointDataType,
  ElementPointOperationType,

  // Additional exports - core types
  ElementDataAccessor,
  Element,

  type Point, type PointF,type Rect,




  // Additional exports - data types
  RecogResultData,
  Link,
  Title,
  TextBox,
  Stroke,
  Geometry,
  RecognData
};
