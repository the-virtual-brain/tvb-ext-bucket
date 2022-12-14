import {BucketFileBrowser} from "../bucketFileBrowser";
import {NoErrorThrownError, getError} from "./testUtils";
import {BreadCrumbNotFoundError} from "../exceptions";

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
})