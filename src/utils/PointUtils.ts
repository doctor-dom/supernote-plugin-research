/**
 * Utilities for converting between EMR (large coordinate system) and screen coordinates.
 */

import type { Point } from "../model/Element";
import { verifyParams, PointSchema } from '../sdk/utils/VerifyUtils';

// Size type
interface Size {
  width: number;
  height: number;
}

/**
 * Point coordinate conversion utilities.
 */
class PointUtils {
  private static readonly TAG = 'PointUtils';

  // Note page rotation type (legacy notes may require compatibility).
  static readonly ROTATION_0 = 1000;            // 0° portrait
  static readonly ROTATION_0_LR = 2000;         // 0° portrait, left-right split
  static readonly ROTATION_90 = 1090;           // 90° landscape
  static readonly ROTATION_90_UD = 2090;        // 90° landscape, up-down split
  static readonly ROTATION_180 = 1180;          // 180° portrait
  static readonly ROTATION_180_LR = 2180;       // 180° portrait, left-right split
  static readonly ROTATION_270 = 1270;          // 270° landscape
  static readonly ROTATION_270_UD = 2270;       // 270° landscape, up-down split

  // Device type constants
  static readonly MACHINE_TYPE_A5 = 0;          // A5
  static readonly MACHINE_TYPE_A6 = 1;          // A6
  static readonly MACHINE_TYPE_A6X = 2;         // A6X
  static readonly MACHINE_TYPE_A5X = 3;         // A5X
  static readonly MACHINE_TYPE_A6X2 = 4;        // A6X2(N6)
  static readonly MACHINE_TYPE_A5X2 = 5;        // A5X2(N5)

  static readonly A5X2_PAGE_SIZE = { width: 1920, height: 2560 };

  static readonly NORMAL_PAGE_SIZE = { width: 1404, height: 1872 };

  /**
   * Converts Android screen coordinates to EMR coordinates.
   * @param point Input point.
   * @param pageSize Page size used to compute the mapping ratio ({ width, height }).
   * @returns Converted EMR point.
   */
  static androidPoint2Emr(point: Point, pageSize: { width: number, height: number }): Point {
    verifyParams(
      {
        point: { type: 'object', required: true, properties: PointSchema },
        pageSize: {
          type: 'object',
          required: true,
          properties: {
            width: { type: 'number', required: true, integer: true, min: 1 },
            height: { type: 'number', required: true, integer: true, min: 1 },
          },
        },
      },
      { point, pageSize },
      { allowUnknown: true, rootName: 'androidPoint2Emr' }
    );
    
    const maxX = PointUtils.getRealMaxX(pageSize);
    const maxY = PointUtils.getRealMaxY(pageSize);

    const mappingTimesX = maxX / (pageSize.height - 1);
    const mappingTimesY = maxY / (pageSize.width - 1);

    const srcPoint: Point = {
      x: point.y,
      y: pageSize.width - 1 - point.x
    };

    const dstPoint: Point = {
      x: srcPoint.x * mappingTimesX,
      y: srcPoint.y * mappingTimesY
    };

    return dstPoint;
  }

  /**
   * Converts EMR coordinates to Android screen coordinates.
   * @param point Input point.
   * @param pageSize Page size used to compute the mapping ratio ({ width, height }).
   * @returns Converted Android point.
   */
  static emrPoint2Android(point: Point, pageSize: { width: number, height: number }): Point {
    verifyParams(
      {
        point: { type: 'object', required: true, properties: PointSchema },
        pageSize: {
          type: 'object',
          required: true,
          properties: {
            width: { type: 'number', required: true, integer: true, min: 1 },
            height: { type: 'number', required: true, integer: true, min: 1 },
          },
        },
      },
      { point, pageSize },
      { allowUnknown: true, rootName: 'emrPoint2Android' }
    );
    const maxX = PointUtils.getRealMaxX( pageSize);
    const maxY = PointUtils.getRealMaxY(pageSize);

    const mappingTimesX = maxX / (pageSize.height - 1);
    const mappingTimesY = maxY / (pageSize.width - 1);

    // Reverse conversion: EMR -> intermediate coordinate space
    const srcPoint: Point = {
      x: point.x / mappingTimesX,
      y: point.y / mappingTimesY
    };

    // Reverse coordinate transform: intermediate -> Android
    const dstPoint: Point = {
      x: pageSize.width - 1 - srcPoint.y,
      y: srcPoint.x
    };

    return dstPoint;
  }

  static getRealMaxX(pageSize: { width: number, height: number }) {
    if (pageSize.width < pageSize.height) {
      if (pageSize.width === PointUtils.A5X2_PAGE_SIZE.width
        && pageSize.height === PointUtils.A5X2_PAGE_SIZE.height) {
        return 21632;
      }
      if(pageSize.width === PointUtils.NORMAL_PAGE_SIZE.width
        && pageSize.height === PointUtils.NORMAL_PAGE_SIZE.height) {
        return 15819;
      }
      throw new Error('getRealMaxX error, unknown pageSize');
    } else {
      if(pageSize.width === PointUtils.A5X2_PAGE_SIZE.height
        && pageSize.height === PointUtils.A5X2_PAGE_SIZE.width) {
        return 16224;
      }

      if(pageSize.width === PointUtils.NORMAL_PAGE_SIZE.height
        && pageSize.height === PointUtils.NORMAL_PAGE_SIZE.width) {
        return 11864;
      }
      throw new Error('getRealMaxX error, unknown pageSize');
    }

  }

  /**
   * Gets the maximum EMR X value for a page.
   * @param machine Device type (0: A5, 1: A6, 2: A6X, 3: A5X, 4: nomad, 5: Manta)
   * @param rotation Rotation type.
   * @returns Max X value.
   */
  /* static getRealMaxX(machine: number, rotation: number): number {
    if (machine === PointUtils.MACHINE_TYPE_A5X2) {
      switch (rotation) {
        case PointUtils.ROTATION_0:
        case PointUtils.ROTATION_180:
          // maxX:21632 maxY:16224
          return 21632;
        case PointUtils.ROTATION_90:
        case PointUtils.ROTATION_270:
          // maxX:16224 maxY:21632
          return 16224;
        case PointUtils.ROTATION_90_UD:
        case PointUtils.ROTATION_270_UD:
          // maxX:28854 maxY:21632
          return 28854;
        case PointUtils.ROTATION_0_LR:
        case PointUtils.ROTATION_180_LR:
          // maxX:21632 maxY:28854
          return 21632;
        default:
          console.error('getRealMaxxByRotation error, error rotation, return default');
          return 21632;
      }
    } else {
      switch (rotation) {
        case PointUtils.ROTATION_0:
        case PointUtils.ROTATION_180:
          // maxX:15819 maxY:11864
          return 15819;
        case PointUtils.ROTATION_90:
        case PointUtils.ROTATION_270:
          // maxX:11864 maxY:15819
          return 11864;
        case PointUtils.ROTATION_90_UD:
        case PointUtils.ROTATION_270_UD:
          // maxX:21098 maxY:15819
          return 21098;
        case PointUtils.ROTATION_0_LR:
        case PointUtils.ROTATION_180_LR:
          // maxX:15819 maxY:21098
          return 15819;
        default:
          console.error('getRealMaxxByRotation error, error rotation, return default');
          return 15819;
      }
    }
  } */

  static getRealMaxY(pageSize: { width: number, height: number }) {
    if(pageSize.width < pageSize.height) {
      if(pageSize.width === PointUtils.A5X2_PAGE_SIZE.width
        && pageSize.height === PointUtils.A5X2_PAGE_SIZE.height) {
        return 16224;
      }
      if(pageSize.width === PointUtils.NORMAL_PAGE_SIZE.width
        && pageSize.height === PointUtils.NORMAL_PAGE_SIZE.height) {
        return 11864;
      }
      throw new Error('getRealMaxY error, unknown pageSize');
    } else {
      if(pageSize.width === PointUtils.A5X2_PAGE_SIZE.height
        && pageSize.height === PointUtils.A5X2_PAGE_SIZE.width) {
        return 21632;
      }

      if(pageSize.width === PointUtils.NORMAL_PAGE_SIZE.height
        && pageSize.height === PointUtils.NORMAL_PAGE_SIZE.width) {
        return 15819;
      }
      throw new Error('getRealMaxY error, unknown pageSize');
    }

  }

  /**
   * Gets the maximum EMR Y value for a page.
   * @param machine Device type (0: A5, 1: A6, 2: A6X, 3: A5X, 4: nomad, 5: Manta)
   * @param rotation Rotation type.
   * @returns Max Y value.
   */
  /*  static getRealMaxY(machine: number, rotation: number): number {
     if (machine === PointUtils.MACHINE_TYPE_A5X2) {
       switch (rotation) {
         case PointUtils.ROTATION_0:
         case PointUtils.ROTATION_180:
           // maxX:21632 maxY:16224
           return 16224;
         case PointUtils.ROTATION_90:
         case PointUtils.ROTATION_270:
           // maxX:16224 maxY:21632
           return 21632;
         case PointUtils.ROTATION_90_UD:
         case PointUtils.ROTATION_270_UD:
           // maxX:28854 maxY:21632
           return 21632;
         case PointUtils.ROTATION_0_LR:
         case PointUtils.ROTATION_180_LR:
           // maxX:21632 maxY:28854
           return 28854;
         default:
           console.error('getRealMaxyByRotation error, error rotation, return default');
           return 16224;
       }
     } else {
       switch (rotation) {
         case PointUtils.ROTATION_0:
         case PointUtils.ROTATION_180:
           // maxX:15819 maxY:11864
           return 11864;
         case PointUtils.ROTATION_90:
         case PointUtils.ROTATION_270:
           // maxX:11864 maxY:15819
           return 15819;
         case PointUtils.ROTATION_90_UD:
         case PointUtils.ROTATION_270_UD:
           // maxX:21098 maxY:15819
           return 15819;
         case PointUtils.ROTATION_0_LR:
         case PointUtils.ROTATION_180_LR:
           // maxX:15819 maxY:21098
           return 21098;
         default:
           console.error('getRealMaxyByRotation error, error rotation, return default');
           return 11864;
       }
     }
   } */

  /**
   * Gets the note page size.
   * @param orientation Orientation/rotation type.
   * @param machineType Device type (0: A5, 1: A6, 2: A6X, 3: A5X, 4: nomad, 5: Manta)
   * @returns Page size.
   */
  static getNotePageSize(orientation: number, machineType: number): Size {
    let screenVertWid = 1404;
    let screenVertHei = 1872;
    let screenUdWid = 1872;
    let screenUdHei = 2496;
    let screenLrWid = 2496;
    let screenLrHei = 1872;
    let screenHoriWid = 1872;
    let screenHoriHei = 1404;

    if (machineType === PointUtils.MACHINE_TYPE_A5X2) { // 1920*2560
      screenVertWid = 1920;
      screenVertHei = 2560;
      screenUdWid = 2560;
      screenUdHei = 3414;
      screenLrWid = 3414;
      screenLrHei = 2560;
      screenHoriWid = 2560;
      screenHoriHei = 1920;
    }
    // else keep init value for A5X

    let width: number;
    let height: number;

    switch (orientation) {
      case PointUtils.ROTATION_0:
        width = screenVertWid;
        height = screenVertHei;
        break;
      case PointUtils.ROTATION_0_LR:
        width = screenLrWid;
        height = screenLrHei;
        break;
      case PointUtils.ROTATION_90:
        width = screenHoriWid;
        height = screenHoriHei;
        break;
      case PointUtils.ROTATION_90_UD:
        width = screenUdWid;
        height = screenUdHei;
        break;
      case PointUtils.ROTATION_180:
        width = screenVertWid;
        height = screenVertHei;
        break;
      case PointUtils.ROTATION_180_LR:
        width = screenLrWid;
        height = screenLrHei;
        break;
      case PointUtils.ROTATION_270:
        width = screenHoriWid;
        height = screenHoriHei;
        break;
      case PointUtils.ROTATION_270_UD:
        width = screenUdWid;
        height = screenUdHei;
        break;
      default:
        console.error(`${PointUtils.TAG}: iRotationType error, use ROTATION_0, orientation: ${orientation}`);
        width = screenVertWid;
        height = screenVertHei;
        break;
    }

    return { width, height };
  }
}

// Export types and utilities
export type { Size };
export { PointUtils };
export default PointUtils;
