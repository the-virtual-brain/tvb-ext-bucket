import { requestAPI } from './handler';
import {
  BreadCrumbNotFoundError,
  FileNameError,
  FilePathMatchError,
  InvalidDirectoryError
} from './exceptions';
import { isValidFileName } from './utils';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { JpFileBrowser } from './JpFileBrowser';

export class BucketFileBrowser {
  private _bucket: string;
  private readonly _bucketEndpoint: string;
  private _breadcrumbs: Array<BucketFileBrowser.BucketDirectory> = [];
  private readonly _currentFiles: Map<string, BucketFileBrowser.IBrowserEntry>;
  private _homeDirectory?: BucketFileBrowser.BucketDirectory;
  private _currentDirectory?: BucketFileBrowser.BucketDirectory;

  /**
   * create a new BucketFileBrowser instance which allows browsing in the bucket provided in options
   * @param options
   */
  constructor(options: BucketFileBrowser.IOptions) {
    this._bucket = options.bucket;
    this._bucketEndpoint = options.bucketEndPoint;
    this._currentFiles = new Map<string, BucketFileBrowser.IBrowserEntry>();
  }

  private _buildBrowser(contents: Array<string>): void {
    this._homeDirectory = new BucketFileBrowser.BucketDirectory(
      '',
      contents,
      this.bucket
    );
    this._currentDirectory = this._homeDirectory;
  }

  /**
   * getter function for the _currentDirectory
   */
  public get currentDirectory(): BucketFileBrowser.BucketDirectory | undefined {
    return this._currentDirectory;
  }

  public get bucket(): string {
    return this._bucket;
  }

  public set bucket(name: string) {
    this._bucket = name;
  }

  /**
   * Get a list of all contents of current directory
   */
  ls(): Array<BucketFileBrowser.IBrowserEntry> {
    if (!this.currentDirectory) {
      return [];
    }
    return this.currentDirectory.ls();
  }

  /**
   * get current file browser path
   */
  get breadcrumbs(): Array<BucketFileBrowser.BucketDirectory> {
    return this._breadcrumbs;
  }

  /**
   * method to get the file structure of the bucket and build the browser for it
   */
  async openBucket(): Promise<BucketFileBrowser.BucketDirectory | undefined> {
    // make sure the current file set is empty before populating
    this._currentFiles.clear();
    this._breadcrumbs = []; // current path is '/'
    const bucketStructureResponse =
      await requestAPI<BucketFileBrowser.IBucketStructureResponse>(
        `${this._bucketEndpoint}?bucket=${this._bucket}`
      );
    this._buildBrowser(bucketStructureResponse.files);

    return this.currentDirectory;
  }

  /**
   * method to access a directory child to current directory
   */
  async cd(directoryName: string): Promise<BucketFileBrowser.BucketDirectory> {
    const dirToCd = this._currentDirectory?.directories.get(directoryName);
    if (!dirToCd) {
      throw new InvalidDirectoryError(
        `Can't cd to directory ${directoryName}! Directory doesn't seem to exist.`
      );
    }
    this._currentDirectory = dirToCd;
    this._currentFiles.clear();
    this._breadcrumbs.push(dirToCd);
    const prefix = this.breadcrumbs.reduce(
      (acc, curr) => acc + curr.name + '/',
      ''
    );
    console.log('Going to files in: ', prefix);

    return dirToCd;
  }

  /**
   * opens a directory from breadcrumbs
   * @param directory
   */
  async goTo(directory: string): Promise<BucketFileBrowser.BucketDirectory> {
    const breadcrumbsCopy = [...this._breadcrumbs];
    let currentBreadcrumb = breadcrumbsCopy.pop();
    while (
      currentBreadcrumb !== undefined &&
      currentBreadcrumb.name !== directory
    ) {
      currentBreadcrumb = breadcrumbsCopy.pop();
    }
    if (currentBreadcrumb === undefined) {
      throw new BreadCrumbNotFoundError(
        `Could not find breadcrumb ${directory}`
      );
    }
    breadcrumbsCopy.push(currentBreadcrumb);
    this._breadcrumbs = breadcrumbsCopy;
    this._currentDirectory = currentBreadcrumb;
    return currentBreadcrumb;
  }
}

export namespace BucketFileBrowser {
  export interface IOptions {
    bucketEndPoint: string;
    bucket: string;
  }

  export interface IBucketStructureResponse {
    message: string;
    files: Array<string>;
  }

  export interface IBrowserEntry {
    name: string;
    absolutePath: string;
    isFile: boolean;
  }

  export interface IDownloadResponse {
    success: boolean;
    message: string;
  }

  export class BucketDirectory implements IBrowserEntry {
    public readonly name: string;
    public readonly bucket: string;
    public readonly absolutePath: string;

    public readonly directories: Map<string, BucketDirectory> = new Map<
      string,
      BucketDirectory
    >();

    public readonly files: Map<string, BucketFile> = new Map<
      string,
      BucketFile
    >();

    public readonly isFile: boolean = false;

    /**
     * Create a new directory instance
     * @param name - name of directory
     * @param contents - array of pathlike strings
     * @param bucket - bucket name as string
     * @param absolutePath - pathlike string representing the absolute path of the directory in bucket
     */
    constructor(
      name: string,
      contents: Array<string>,
      bucket: string,
      absolutePath?: string
    ) {
      this.name = name;
      this.bucket = bucket;
      this.absolutePath = absolutePath ? absolutePath : '';
      this._buildContents(contents);
    }

    private _buildContents(contents: Array<string>): void {
      const subdirs = new Map<string, Array<string>>();
      // instantiate files in this directory while creating the list with subdirectories
      for (const path of contents) {
        if (!path.includes('/')) {
          const fileEntry = new BucketFile(
            path,
            this.absolutePath ? `${this.absolutePath}/${path}` : path,
            this.bucket
          );

          this.files.set(fileEntry.name, fileEntry);
        } else {
          const dirName = path.slice(0, path.indexOf('/'));
          const subEntry = path.slice(path.indexOf('/') + 1);
          const subdirContents = subdirs.get(dirName);
          if (subdirContents) {
            subdirContents.push(subEntry);
          } else {
            subdirs.set(dirName, [subEntry]);
          }
        }
      }
      // build sub-directories
      subdirs.forEach((value, key) => {
        const absolutePath = this.absolutePath
          ? `${this.absolutePath}/${key}`
          : key;
        const subDir = new BucketDirectory(
          key,
          value,
          this.bucket,
          absolutePath
        );
        this.directories.set(key, subDir);
      });
    }

    public get filesCount(): number {
      return this.files.size;
    }

    public get directoriesCount(): number {
      return this.directories.size;
    }

    /**
     * Get a list of all contents of current directory
     */
    ls(): Array<BucketFileBrowser.IBrowserEntry> {
      const contents: Array<BucketFileBrowser.IBrowserEntry> = [];

      for (const dir of this.directories.values()) {
        contents.push(dir);
      }

      for (const fileEntry of this.files.values()) {
        contents.push(fileEntry);
      }

      return contents;
    }
  }

  export class BucketFile implements IBrowserEntry {
    public readonly name: string;
    public readonly bucket: string;
    public readonly absolutePath: string;

    public readonly isFile: boolean = true;

    /**
     * Create a BucketFile instance
     * @param name - name of the file
     * @param absolutePath - absolute path to this file
     * @param bucket - bucket name as string
     */
    constructor(name: string, absolutePath: string, bucket: string) {
      this.name = name;
      this.bucket = bucket;
      this.absolutePath = absolutePath;
      this._validate();
    }

    /**
     * Calls the endpoint to download this file from bucket to current path in jp file browser
     */
    public async download(): Promise<void> {
      try {
        const filePath = this.absolutePath;

        let downloadDestination = JpFileBrowser.current?.model.path;
        if (!downloadDestination) {
          downloadDestination = '';
        }

        console.log('downloading to: ', downloadDestination);

        const resp = await requestAPI<IDownloadResponse>(
          `download?file=${encodeURIComponent(
            filePath
          )}&download_destination=${encodeURIComponent(
            downloadDestination
          )}&bucket=${this.bucket}`
        );
        await showDialog({
          title: resp.success ? 'Success!' : 'Failed!',
          body: `File ${this.name} was ${
            resp.success ? '' : 'not'
          } downloaded! \n ${resp.message ? resp.message : ''}`,
          buttons: [Dialog.okButton({ label: 'OK' })]
        });
      } catch (err) {
        await showErrorMessage('Something went wrong!', err);
      }
    }

    private _validate(): void {
      if (!isValidFileName(this.name)) {
        throw new FileNameError(`${this.name} is an invalid file name!`);
      }

      if (!this.absolutePath.endsWith(this.name)) {
        throw new FilePathMatchError(
          `Provided absolute path (${this.absolutePath}) does not lead to the provided file name (${this.name})!`
        );
      }
    }
  }
}
