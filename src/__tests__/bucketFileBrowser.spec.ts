import {BucketFileBrowser} from "../bucketFileBrowser";
import {NoErrorThrownError, getError} from "./testUtils";
import {BreadCrumbNotFoundError, FileNameError, FilePathMatchError} from "../exceptions";
import BucketDirectory = BucketFileBrowser.BucketDirectory;
import BucketFile = BucketFileBrowser.BucketFile;

jest.mock('../handler', () => {
  return {
    __esModule: true,
    requestAPI: jest
      .fn()
      .mockImplementation((_url, _init, _settings) => Promise.resolve(filesData))
  };
});

const filesData = {
    message: 'test',
    files: ['file1.txt', 'file2.txt', 'dir1/dir2/file1.py']
}

describe('Test BucketFile', () => {
    it('Creates BucketFile from params', () => {
        const name = 'test.py';
        const path = 'home/test.py';
        const file = new BucketFile(name, path);
        expect(file.name).toEqual(name);
        expect(file.absolutePath).toEqual(path);
    });

    it('Throws FilePathMatchError when name and path do not match', async () => {
        const name = 'test.py';
        let path = 'home/test.p';
        let err = await getError(() => new BucketFile(name, path));
        expect(err).toBeInstanceOf(FilePathMatchError);
        path = 'home/test.py/smth.py';
        err = await getError(() => new BucketFile(name, path));
        expect(err).toBeInstanceOf(FilePathMatchError);
        path = 'home/test.py/';
        err = await getError(() => new BucketFile(name, path));
        expect(err).toBeInstanceOf(FilePathMatchError);
    });

    it('Throws FileNameError when not a valid file name', async () => {
        const name = 'test.';
        let path = 'home/test.p';
        let err = await getError(() => new BucketFile(name, path));
        expect(err).toBeInstanceOf(FileNameError);
    });
});

describe('Test BucketDirectory', () => {
    it('Tests correct instantiation from name and pathlike array', () => {
        const [name, contents] = ['', ['file.py']];
        const dir = new BucketDirectory(name, contents);
        expect(dir.directoriesCount).toEqual(0);
        expect(dir.filesCount).toEqual(1);
        expect(dir.files.get('file.py')).toBeInstanceOf(BucketFile);
    });

    it('Tests correct instantiation from name and complex pathlike array', () => {
        const [name, contents] = ['home', ['files/file.py']];
        const dir = new BucketDirectory(name, contents);
        expect(dir.directoriesCount).toEqual(1);
        expect(dir.filesCount).toEqual(0);
        const subDir = dir.directories.get('files');
        expect(subDir).toBeInstanceOf(BucketDirectory);
        expect(subDir!.name).toEqual('files');
        expect(subDir!.filesCount).toEqual(1);
        expect(subDir!.directoriesCount).toEqual(0);
    });

});

describe('Test BucketFileBrowser', () => {
    it('tests openBucket', async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'})
        const files = await browser.openBucket();
        const expectedFiles = [{"isFile": false, "name": "dir1"}, {"isFile": true, "name": "file1.txt"}, {
    "isFile": true,
    "name": "file2.txt",
   }]
        expect(files).toEqual(expectedFiles);
        expect(browser.breadcrumbs).toEqual([]);
    });

    it('tests cd, goTo and breadcrumbs', async () => {
        const browser = new BucketFileBrowser({bucketEndPoint: 'test', bucket: 'test'});
        await browser.cd("dir1");
        expect(browser.breadcrumbs).toEqual(["dir1"]);
        await browser.cd("dir2");
        expect(browser.breadcrumbs).toEqual(["dir1", "dir2"]);

        const err = await getError(async () => {
            await browser.goTo("nonExisting");
        });
        expect(err).not.toBeInstanceOf(NoErrorThrownError);
        expect(err).toBeInstanceOf(BreadCrumbNotFoundError);
        expect(err.message).toEqual('Could not find breadcrumb nonExisting');

        await browser.goTo("dir1");
        expect(browser.breadcrumbs).toEqual(["dir1"]);
    });

    it("Creates a directory/file structure from a path list", () => {
        const name = 'user';
        const paths = ['home/files', 'home/files/test.py', 'docs/info.txt'];
        const dir = new BucketDirectory(name, paths);
        expect(dir.name).toEqual(name);
        expect(dir.filesCount).toEqual(0);
        expect(dir.directoriesCount).toEqual(2);
    })
})