import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/// File utility class
export interface Spec extends TurboModule {
    // Check if file exists
    exists(filePath:string):Promise<boolean>;

    // Get SD card file path
    getExternalDirPath():Promise<Array<string>|null|undefined>;

    // Create directory
    makeDir(dirPath:string):Promise<boolean>;

    // Get export directory path
    getExportPath():Promise<string>;

    // Rename file
    renameToFile(sourceFile:string, destFile:string):Promise<boolean>;

    // Copy file
    copyFile(sourcePath:string, destPath:string):Promise<boolean>;

    /// List all file paths in directory
    listFiles(dirPath:string):Promise<Array<string>|null|undefined>;

    // Get file MD5 value
    getFileMD5(filePath:string):Promise<string>;

    // Delete file
    deleteFile(filePath:string):Promise<boolean>;

    // Delete directory
    deleteDir(dirPath:string):Promise<boolean>;

    // Get file list
    getFileList(suffixList:Array<string>):Promise<Array<string>|null|undefined>;

    // Get image list
    getImageList():Promise<Array<string>|null|undefined>;

    /**
     * Open file path in file manager
     * @param {string} path
     */
    openFilePath(path:string):Promise<boolean>;

    getStorageAvailableSpace():Promise<number>;



}


export default TurboModuleRegistry.getEnforcing<Spec>('RTNFileUtils');
