import { requestAPI } from './handler';
import { BreadCrumbNotFoundError } from './exceptions';

export class BucketFileBrowser {
  private _bucket: string;
  private readonly _bucketEndpoint: string;
  private _breadcrumbs: Array<string> = [];
  private readonly _currentFiles: Map<string, BucketFileBrowser.IBucketEntry>;

  /**
   * create a new BucketFileBrowser instance which allows browsing in the bucket provided in options
   * @param options
   */
  constructor(options: BucketFileBrowser.IOptions) {
    this._bucket = options.bucket;
    this._bucketEndpoint = options.bucketEndPoint;
    this._currentFiles = new Map<string, BucketFileBrowser.IBucketEntry>();
  }

  public get bucket() {
    return this._bucket;
  }

  public set bucket(name: string) {
    this._bucket = name;
  }

  /**
   * get current file browser path
   */
  get breadcrumbs(): Array<string> {
    return this._breadcrumbs;
  }

  /**
   * get current files sorted
   */
  private _sortedFiles(
    files: Array<string>
  ): Array<BucketFileBrowser.IBucketEntry> {
    this._buildEntries(files);
    const entriesList = Array.from(this._currentFiles.values());
    entriesList.sort((a, b) => (!a.isFile && b.isFile ? -1 : 1));
    return entriesList;
  }

  /**
   * method to get the first level of folders and files in the bucket
   */
  async openBucket(): Promise<Array<BucketFileBrowser.IBucketEntry>> {
    // make sure the current file set is empty before populating
    this._currentFiles.clear();
    this._breadcrumbs = []; // current path is '/'
    const firstLevelFiles =
      await requestAPI<BucketFileBrowser.IBucketStructureResponse>(
        `${this._bucketEndpoint}?bucket=${this._bucket}`
      );
    return this._sortedFiles(firstLevelFiles.files);
  }

  /**
   * method to get next level of files/directories from a directory
   */
  async cd(directory: string): Promise<Array<BucketFileBrowser.IBucketEntry>> {
    this._currentFiles.clear();
    this._breadcrumbs.push(`${directory}`);
    const prefix = this.breadcrumbs.reduce((acc, curr) => acc + curr + '/', '');
    console.log('Going to files in: ', prefix);
    const contents =
      await requestAPI<BucketFileBrowser.IBucketStructureResponse>(
        `${this._bucketEndpoint}?bucket=${this._bucket}&prefix=${prefix}`
      );
    return this._sortedFiles(contents.files);
  }

  /**
   * opens a directory from breadcrumbs
   * @param directory
   */
  async goTo(
    directory: string
  ): Promise<Array<BucketFileBrowser.IBucketEntry>> {
    if (!this._breadcrumbs.includes(directory)) {
      throw new BreadCrumbNotFoundError(
        `Could not find breadcrumb ${directory}`
      );
    }

    this._breadcrumbs = this._breadcrumbs.slice(
      0,
      this._breadcrumbs.indexOf(directory)
    );

    return this.cd(directory);
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
