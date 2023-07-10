import { requestAPI } from './handler';
import {
  BreadCrumbNotFoundError,
  FilePathMatchError,
  InvalidDirectoryError
} from './exceptions';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { JpFileBrowser } from './JpFileBrowser';
import { getExtension } from './utils/bucketUtils';

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
   * Gets a list of all the available buckets for the current user
   */
  async getAvailableBuckets(): Promise<Array<string>> {
    let bucketsList: Array<string> = [];
    try {
      bucketsList = await requestAPI<Array<string>>('buckets');
    } catch (e) {
      await showErrorMessage(
        'ERROR',
        'Could not get available buckets from server'
      );
    }

    return bucketsList;
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
    try {
      const bucketStructureResponse =
        await requestAPI<BucketFileBrowser.IBucketStructureResponse>(
          `${this._bucketEndpoint}?bucket=${this._bucket}`
        );
      if (!bucketStructureResponse.success) {
        await showErrorMessage('ERROR', bucketStructureResponse.message);
      }
      this._buildBrowser(bucketStructureResponse.files);
    } catch (e) {
      await showErrorMessage('ERROR', `Could not open bucket. ${e}`);
    }

    return this.currentDirectory;
  }

  /**
   * method to access a directory child to current directory. If no dir name is provided, navigates home.
   */
  async cd(directoryName?: string): Promise<BucketFileBrowser.BucketDirectory> {
    if ((!directoryName || directoryName === '') && this._homeDirectory) {
      this._currentDirectory = this._homeDirectory;
      this._currentFiles.clear();
      this._breadcrumbs = [];
      return this._homeDirectory;
    }
    const dirToCd = this._currentDirectory?.directories.get(
      directoryName ?? ''
    );
    if (!dirToCd) {
      throw new InvalidDirectoryError(
        `Can't cd to directory ${directoryName}! Directory doesn't seem to exist.`
      );
    }
    this._currentDirectory = dirToCd;
    this._currentFiles.clear();
    this._breadcrumbs.push(dirToCd);

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
    success: boolean;
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

    /**
     * Uploads a file from drive to bucket in this directory
     * @param fileSource file to be uploaded from drive in the form path/to/file
     * @param filename name of the file after upload
     */
    async upload(fileSource: string, filename: string): Promise<void> {
      const allowUpload = await this._confirmOverride(filename);
      if (!allowUpload) {
        return;
      }
      const result = requestAPI(
        `upload?source_file=${fileSource}&bucket=${this.bucket}&destination=${this.absolutePath}&filename=${filename}`
      );
      console.log('result: ', result);
    }

    /**
     * Get an upload URL for a file to this directory in the same bucket as this directory
     * Note: to upload the file make a PUT request with a bytes stream to the URL returned by this method
     * @param filename
     */
    async getUploadUrl(filename: string): Promise<string> {
      const allowUpload = await this._confirmOverride(filename);
      if (!allowUpload) {
        return '#';
      }
      const uploadUrlResponse = await requestAPI<INativeUploadResponse>(
        `local_upload?to_bucket=${
          this.bucket
        }&with_name=${filename}&to_path=${encodeURIComponent(
          this.absolutePath
        )}`
      );
      if (!uploadUrlResponse.success) {
        await showErrorMessage(
          'Error',
          'Could not get an upload url for this file!'
        );
      }
      return uploadUrlResponse.url;
    }

    /**
     * Checks if a file with the provided <filename> already exists in this directory
     * and prompts the user if it should be replaced. Returns true if it should be replaced
     * and false otherwise
     * @param filename
     * @private
     */
    private async _confirmOverride(filename: string): Promise<boolean> {
      if (!this.files.get(filename)) {
        return true;
      }
      const confirm = await showDialog({
        title: 'Warning!',
        body: 'A file with this name already exists in this directory. If you continue it will be overwritten!',
        buttons: [
          Dialog.cancelButton({ label: 'Cancel' }),
          Dialog.okButton({ label: 'Continue' })
        ]
      });

      return confirm.button.accept;
    }
  }

  export class BucketFile implements IBrowserEntry {
    private _name: string;
    public readonly bucket: string;
    private _absolutePath: string;

    public readonly isFile: boolean = true;

    /**
     * Create a BucketFile instance
     * @param name - name of the file
     * @param absolutePath - absolute path to this file
     * @param bucket - bucket name as string
     */
    constructor(name: string, absolutePath: string, bucket: string) {
      this._name = name;
      this.bucket = bucket;
      this._absolutePath = absolutePath;
      this._validate();
    }

    public get name(): string {
      return this._name;
    }

    public get absolutePath(): string {
      return this._absolutePath;
    }

    /**
     * Calls the endpoint to download this file from bucket to current path in jp file browser
     */
    async download(): Promise<void> {
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

    /**
     * Get a download URL for this file.
     * Note: to download the file you must make a GET request to the URL returned by this method
     */
    async getDownloadUrl(): Promise<string> {
      let url = '';
      try {
        const response = await requestAPI<IDownloadUrl>(
          `download_url?file=${this.absolutePath}&bucket=${this.bucket}`
        );
        url = response.url;
      } catch (e) {
        await showErrorMessage('Failed', e);
      }

      return url;
    }

    /**
     * Method to delete this file from its bucket
     */
    async delete(): Promise<IDeleteResponse | void> {
      try {
        return await requestAPI<IDeleteResponse>(
          `objects/${encodeURIComponent(this.bucket)}/${encodeURIComponent(
            this.absolutePath
          )}`,
          { method: 'DELETE' }
        );
      } catch (e) {
        await showErrorMessage('Failed', e);
      }
    }

    /**
     * method to rename this file
     * @param newName
     */
    async rename(newName: string): Promise<void> {
      if (getExtension(newName) !== getExtension(this.name)) {
        const confirm = await showDialog({
          title: 'Warning!',
          body: 'If you change the file extension, the file might become unusable!',
          buttons: [
            Dialog.cancelButton({ label: 'Cancel' }),
            Dialog.okButton({ label: 'Continue' })
          ]
        });

        if (!confirm.button.accept) {
          return;
        }
      }
      const response = await requestAPI<IRenameResponse>(
        `rename?path=${encodeURIComponent(
          this.absolutePath
        )}&new_name=${newName}&bucket=${encodeURIComponent(this.bucket)}`
      );
      if (!response.success) {
        throw new Error(`Could not rename file ${this.name} to ${newName}!`);
      }
      this._name = response.newData.name;
      this._absolutePath = response.newData.path;
    }

    private _validate(): void {
      if (!this.absolutePath.endsWith(this.name)) {
        throw new FilePathMatchError(
          `Provided absolute path (${this.absolutePath}) does not lead to the provided file name (${this.name})!`
        );
      }
    }
  }

  export interface INativeUploadResponse {
    success: boolean;
    url: string;
  }

  export interface IDownloadUrl {
    success: boolean;
    url: string;
  }

  export interface IDeleteResponse {
    success: boolean;
    message: string;
  }

  export interface IRenameResponse {
    success: boolean;
    message: string;
    newData: fileInfo;
  }

  type fileInfo = {
    name: string;
    path: string;
  };
}
