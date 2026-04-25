import type { TurboModule } from 'react-native';
export interface Spec extends TurboModule {
    exists(filePath: string): Promise<boolean>;
    getExternalDirPath(): Promise<Array<string> | null | undefined>;
    makeDir(dirPath: string): Promise<boolean>;
    getExportPath(): Promise<string>;
    renameToFile(sourceFile: string, destFile: string): Promise<boolean>;
    copyFile(sourcePath: string, destPath: string): Promise<boolean>;
    listFiles(dirPath: string): Promise<Array<string> | null | undefined>;
    getFileMD5(filePath: string): Promise<string>;
    deleteFile(filePath: string): Promise<boolean>;
    deleteDir(dirPath: string): Promise<boolean>;
    getFileList(suffixList: Array<string>): Promise<Array<string> | null | undefined>;
    getImageList(): Promise<Array<string> | null | undefined>;
    /**
     * Open file path in file manager
     * @param {string} path
     */
    openFilePath(path: string): Promise<boolean>;
    getStorageAvailableSpace(): Promise<number>;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeFileUtils.d.ts.map