/**
 * Utilities for converting between EMR (large coordinate system) and screen coordinates.
 */
import type { Point } from "../model/Element";
interface Size {
    width: number;
    height: number;
}
/**
 * Point coordinate conversion utilities.
 */
declare class PointUtils {
    private static readonly TAG;
    static readonly ROTATION_0 = 1000;
    static readonly ROTATION_0_LR = 2000;
    static readonly ROTATION_90 = 1090;
    static readonly ROTATION_90_UD = 2090;
    static readonly ROTATION_180 = 1180;
    static readonly ROTATION_180_LR = 2180;
    static readonly ROTATION_270 = 1270;
    static readonly ROTATION_270_UD = 2270;
    static readonly MACHINE_TYPE_A5 = 0;
    static readonly MACHINE_TYPE_A6 = 1;
    static readonly MACHINE_TYPE_A6X = 2;
    static readonly MACHINE_TYPE_A5X = 3;
    static readonly MACHINE_TYPE_A6X2 = 4;
    static readonly MACHINE_TYPE_A5X2 = 5;
    static readonly A5X2_PAGE_SIZE: {
        width: number;
        height: number;
    };
    static readonly NORMAL_PAGE_SIZE: {
        width: number;
        height: number;
    };
    /**
     * Converts Android screen coordinates to EMR coordinates.
     * @param point Input point.
     * @param pageSize Page size used to compute the mapping ratio ({ width, height }).
     * @returns Converted EMR point.
     */
    static androidPoint2Emr(point: Point, pageSize: {
        width: number;
        height: number;
    }): Point;
    /**
     * Converts EMR coordinates to Android screen coordinates.
     * @param point Input point.
     * @param pageSize Page size used to compute the mapping ratio ({ width, height }).
     * @returns Converted Android point.
     */
    static emrPoint2Android(point: Point, pageSize: {
        width: number;
        height: number;
    }): Point;
    static getRealMaxX(pageSize: {
        width: number;
        height: number;
    }): 21632 | 15819 | 16224 | 11864;
    /**
     * Gets the maximum EMR X value for a page.
     * @param machine Device type (0: A5, 1: A6, 2: A6X, 3: A5X, 4: nomad, 5: Manta)
     * @param rotation Rotation type.
     * @returns Max X value.
     */
    static getRealMaxY(pageSize: {
        width: number;
        height: number;
    }): 21632 | 15819 | 16224 | 11864;
    /**
     * Gets the maximum EMR Y value for a page.
     * @param machine Device type (0: A5, 1: A6, 2: A6X, 3: A5X, 4: nomad, 5: Manta)
     * @param rotation Rotation type.
     * @returns Max Y value.
     */
    /**
     * Gets the note page size.
     * @param orientation Orientation/rotation type.
     * @param machineType Device type (0: A5, 1: A6, 2: A6X, 3: A5X, 4: nomad, 5: Manta)
     * @returns Page size.
     */
    static getNotePageSize(orientation: number, machineType: number): Size;
}
export type { Size };
export { PointUtils };
export default PointUtils;
//# sourceMappingURL=PointUtils.d.ts.map