import {BucketFileBrowser} from "../bucketFileBrowser";
import {getError, NoErrorThrownError} from "./testUtils";
import {BreadCrumbNotFoundError, FilePathMatchError, InvalidDirectoryError} from "../exceptions";
import BucketDirectory = BucketFileBrowser.BucketDirectory;
import BucketFile = BucketFileBrowser.BucketFile;
import {requestAPI} from "../handler";
import {showDialog, showErrorMessage} from "@jupyterlab/apputils";


jest.mock('../handler', () => {
  return {
    __esModule: true,
    requestAPI: jest
      .fn()
      .mockImplementation((url: string, _init, _settings) => {
          if (url.includes('fail')){
              return Promise.reject(new Error());
          }
          return Promise.resolve(filesData)
      })
  };
});

jest.mock('@jupyterlab/apputils', () => {
    interface IOptions {
          title: string;
          body: string;
          buttons: Array<any>;
    }
    interface IErrorOptions {
        title: string;
        error: any;
    }
    return {
        __esModule: true,
        Dialog: {okButton:(_options: { label: string })=>{return;}},
        showDialog: jest
            .fn()
            .mockImplementation(async (_options: IOptions) => Promise.resolve(null)),
        showErrorMessage: jest
            .fn()
            .mockImplementation( async (_options: IErrorOptions) => Promise.resolve(null)),
    }
});

const filesData = {
    message: 'test',
    files: ['file1.txt', 'file2.txt', 'dir1/dir2/file1.py', 'other/file']
}

describe('Test BucketFile', () => {
    it('Creates BucketFile from params', () => {
        const name = 'test.py';
        const path = 'home/test.py';
        const file = new BucketFile(name, path, 'test');
        expect(file.name).toEqual(name);
        expect(file.absolutePath).toEqual(path);
    });

    it('Throws FilePathMatchError when name and path do not match', async () => {
        const name = 'test.py';
        let path = 'home/test.p';
        let err = await getError(() => new BucketFile(name, path, 'test'));
        expect(err).toBeInstanceOf(FilePathMatchError);
        path = 'home/test.py/smth.py';
        err = await getError(() => new BucketFile(name, path, 'test'));
        expect(err).toBeInstanceOf(FilePathMatchError);
        path = 'home/test.py/';
        err = await getError(() => new BucketFile(name, path, 'test'));
        expect(err).toBeInstanceOf(FilePathMatchError);
    });

    it('Does not throw error when not a valid file name (object storage does not enforce naming)', async () => {
        const name = 'test.';
        let path = 'home/test.';
        let err = await getError(() => new BucketFile(name, path, 'test'));
        expect(err).toBeInstanceOf(NoErrorThrownError);
    });

    it('Tests download success', async () => {
        const [name, absolutePath, bucket] = ['a.py', 'files/a.py', 'test'];
        const bucketFile = new BucketFile(name, absolutePath, bucket);
        await bucketFile.download();
        expect(requestAPI).toBeCalled();
        expect(showDialog).toBeCalled();
    });

    it('Tests download fail', async () => {
        const [name, absolutePath, bucket] = ['a.py', 'files/a.py', 'fail'];
        const bucketFile = new BucketFile(name, absolutePath, bucket);
        await bucketFile.download();
        expect(requestAPI).toBeCalled();
        expect(showDialog).toBeCalledTimes(1); // same call from previous test
        expect(showErrorMessage).toBeCalled();
    });
});

describe('Test BucketDirectory', () => {
    it('Tests correct instantiation from name and filelike array', () => {
        const [name, contents] = ['', ['file.py']];
        const dir = new BucketDirectory(name, contents, 'test');
        expect(dir.directoriesCount).toEqual(0);
        expect(dir.filesCount).toEqual(1);
        expect(dir.files.get('file.py')).toBeInstanceOf(BucketFile);
    });

    it('Tests ls lists all files and directories in a directory', () => {
        const [name, contents] = ['home', ['a.pdf', 'files/file.py']];
        const dir = new BucketDirectory(name, contents, 'test');
        const dirContents = dir.ls();
        expect(dirContents.length).toEqual(2);
        expect(dirContents[0]).toBeInstanceOf(BucketDirectory);
        expect(dirContents[0].name).toEqual('files');
        expect(dirContents[1]).toBeInstanceOf(BucketFile);
        expect(dirContents[1].name).toEqual('a.pdf');
    });

    it('Tests correct instantiation from name and simple pathlike array', () => {
        const [name, contents] = ['home', ['files/file.py']];
        const dir = new BucketDirectory(name, contents, 'test');
        expect(dir.directoriesCount).toEqual(1);
        expect(dir.filesCount).toEqual(0);
        const subDir = dir.directories.get('files');
        expect(subDir).toBeInstanceOf(BucketDirectory);
        expect(subDir!.name).toEqual('files');
        expect(subDir!.filesCount).toEqual(1);
        expect(subDir!.directoriesCount).toEqual(0);
    });

    it('Tests correct instantiation from name and complex pathlike array', () => {
        const [name, contents] = ['home', ['ex.jpg', 'ex/ex.py', 'files/other.txt', 'files/file.py']];
        const dir = new BucketDirectory(name, contents, 'test');
        expect(dir.directoriesCount).toEqual(2);
        expect(dir.filesCount).toEqual(1);
        const subDir1 = dir.directories.get('files');
        expect(subDir1).toBeInstanceOf(BucketDirectory);
        expect(subDir1!.name).toEqual('files');
        expect(subDir1!.filesCount).toEqual(2);
        expect(subDir1!.directoriesCount).toEqual(0);
        const subDir2 = dir.directories.get('ex');
        expect(subDir2!.filesCount).toEqual(1);
        expect(subDir2!.directoriesCount).toEqual(0);
    });

});

describe('Test BucketFileBrowser', () => {
    it('tests openBucket', async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'})
        let contents = browser.ls();
        expect(contents.length).toEqual(0);
        const dir = await browser.openBucket();
        contents = browser.ls();
        expect(contents.length).toEqual(4);
        expect(dir).toBeInstanceOf(BucketDirectory);
        expect(dir?.ls().length).toEqual(4);
        expect(browser.bucket).toEqual('test');
        expect(browser.breadcrumbs).toEqual([]);
    });

    it('Tests cd success if dir exists as child of current dir', async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'});
        await browser.openBucket();
        expect(browser.currentDirectory).toBeInstanceOf(BucketDirectory);
        expect(browser.currentDirectory?.directoriesCount).toEqual(2);
        expect(browser.currentDirectory?.filesCount).toEqual(2);
        await browser.cd('dir1');
        expect(browser.currentDirectory).toBeInstanceOf(BucketDirectory);
        expect(browser.currentDirectory?.name).toEqual('dir1')
        expect(browser.breadcrumbs[0].name).toEqual('dir1');
        expect(browser.breadcrumbs.length).toEqual(1);
        await browser.cd('dir2');
        expect(browser.currentDirectory?.name).toEqual('dir2');
        expect(browser.currentDirectory?.filesCount).toEqual(1);
        expect(browser.breadcrumbs.length).toEqual(2);
        expect(browser.breadcrumbs[1].name).toEqual('dir2');
    });

    it('Tests cd throws exception if current dir does not contain target dir', async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'});
        await browser.openBucket();
        const err = await getError(async () => {await browser.cd('random');});
        expect(err).toBeInstanceOf(InvalidDirectoryError);
    });

    it('tests cd, goTo and breadcrumbs', async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'});
        await browser.openBucket();
        expect(browser.currentDirectory?.files.get('file1.txt')?.absolutePath).toEqual('file1.txt');
        const dir = await browser.cd("dir1");
        expect(browser.currentDirectory).toEqual(dir);
        expect(dir).toBeInstanceOf(BucketDirectory);
        expect(browser.breadcrumbs.length).toEqual(1);
        expect(browser.breadcrumbs[0]).toBeInstanceOf(BucketDirectory);
        const dir2 = await browser.cd("dir2");
        expect(browser.currentDirectory).toEqual(dir2);
        expect(dir2).toBeInstanceOf(BucketDirectory);
        expect(browser.breadcrumbs.length).toEqual(2);
        expect(browser.breadcrumbs[1].name).toEqual("dir2");
        expect(dir2.absolutePath).toEqual('dir1/dir2');
        expect(dir2.files.get('file1.py')?.absolutePath).toEqual('dir1/dir2/file1.py');
        const goToDir = await browser.goTo("dir1");
        expect(dir).toEqual(goToDir);
        expect(browser.currentDirectory).toEqual(dir)
        expect(browser.breadcrumbs.length).toEqual(1);
        expect(browser.breadcrumbs[0]).toEqual(dir);
    });

    it("Tests cd to dir not as child to current dir throws InvalidDirectoryError", async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'});
        await browser.openBucket();
        const err = await getError(async () => {await browser.cd('random')});
        expect(err).toBeInstanceOf(InvalidDirectoryError);
    });

    it("Tests cd to dir of bucket not opened throws InvalidDirectoryError", async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'});
        const err = await getError(async () => {await browser.cd('random')});
        expect(err).toBeInstanceOf(InvalidDirectoryError);
    });

    it("Tests goTo dir not in breadcrumbs throws BreadCrumbNotFoundError", async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'});
        await browser.openBucket();
        expect(browser.breadcrumbs.length).toEqual(0);
        const err = await getError(async () => {await browser.goTo("random_dir")});
        expect(err).toBeInstanceOf(BreadCrumbNotFoundError);
    });
});