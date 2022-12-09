import { requestAPI } from './handler';

export class BucketFileBrowser {
  private readonly _bucket: string;
  private readonly _bucketEndpoint: string;
  private _currentDirectoryPath: string;
  private _currentFiles: Map<string, BucketFileBrowser.IBucketEntry>;

  /**
   * create a new BucketFileBrowser instance which allows browsing in the bucket provided in options
   * @param options
   */
  constructor(options: BucketFileBrowser.IOptions) {
    this._bucket = options.bucket;
    this._bucketEndpoint = options.bucketEndPoint;
    this._currentDirectoryPath = options.bucket;
    this._currentFiles = new Map<string, BucketFileBrowser.IBucketEntry>();
  }

  /**
   * get current file browser path
   */
  get currentDirectoryPath(): string {
    return this._currentDirectoryPath;
  }

  /**
   * method to get the first level of folders and files in the bucket
   */
  async openBucket() {
    // make sure the current file set is empty before populating
    this._currentFiles.clear();
    const firstLevelFiles =
      await requestAPI<BucketFileBrowser.IBucketStructureResponse>(
        `${this._bucketEndpoint}?bucket=${this._bucket}`
      );
    this._buildEntries(firstLevelFiles.files);
    console.log('Current files: ', this._currentFiles);
    const filesList = Array.from(this._currentFiles.values());
    filesList.sort((a, b) => (!a.isFile && b.isFile ? -1 : 1)); // make sure entries are sorted file/folder
    return filesList;
  }

  /**
   * method to get next level of files/directories from a directory
   */
  async openDirectory(directory: string) {
    this._currentDirectoryPath += `${directory}/`;
  }

  /**
   * method to build a list of IBucketEntry from a list of file paths
   * @param filesList
   * @private
   */
  private _buildEntries(filesList: Array<string>) {
    for (const path of filesList) {
      let entry;
      if (path.includes('/')) {
        entry = {
          name: path.substring(0, path.indexOf('/')),
          isFile: false
        };
      } else {
        entry = {
          name: path,
          isFile: true
        };
      }
      this._currentFiles.set(entry.name, entry);
    }
  }
}

export namespace BucketFileBrowser {
  export interface IOptions {
    bucketEndPoint: string;
    bucket: string;
  }

  export interface IBucketEntry {
    name: string;
    isFile: boolean;
  }

  export interface IBucketStructureResponse {
    message: string;
    files: Array<string>;
  }
}
