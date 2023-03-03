import {fireEvent, getByText, queryByText, render, waitFor} from "@testing-library/react";
import {CollabSpaceEntry} from "../CollabSpaceEntry";
import {BucketFileBrowser} from "../bucketFileBrowser";
import BucketDirectory = BucketFileBrowser.BucketDirectory;
import React from "react";
import BucketFile = BucketFileBrowser.BucketFile;
import { BucketContextProvider } from "../BucketContext";
import {showErrorMessage} from "@jupyterlab/apputils";
import { BucketSpace } from "../BucketWidget";

const MOCK_BUCKET = 'bucket-files';
const MOCK_BUCKET_RESPONSE = {message: 'test', files: ['foo.py', 'home/bar.py']};

jest.mock('../handler', () => {
  return {
    __esModule: true,
    requestAPI: jest
      .fn()
      .mockImplementation((URL: string, _init, _settings) => {
          if(URL.includes('buckets_list')) {
              return Promise.resolve(['test_bucket', 'bucket_1', 'bucket_2'])
          }
          if(URL.includes('objects')) {
              return Promise.resolve({success: true, message: 'file deleted'});
          }
          if(URL.includes('download')) {
              return Promise.resolve(downloadSuccess);
          }
          if(URL.includes(MOCK_BUCKET)) {
              return Promise.resolve(MOCK_BUCKET_RESPONSE);
          }
          return Promise.resolve(downloadSuccess);
      })
  };
});

const downloadSuccess = {
    success: true,
    message: 'Download success'
}

jest.mock('@jupyterlab/apputils', () => {
    interface IErrorOptions {
        title: string;
        error: any;
    }
    return {
        __esModule: true,
        ...jest.requireActual('@jupyterlab/apputils'),
        showErrorMessage: jest
            .fn()
            .mockImplementation( async (_options: IErrorOptions) => Promise.resolve(undefined)),
    }
});

const onContextFinish = jest.fn().mockImplementation(() => {});

describe('Test ContextMenu', () => {
   it('is not visible on folders', () => {
       const [name, contents, bucket] = ['test', ['test.py'], 'test-bucket'];
       const dir = new BucketDirectory(name, contents, bucket);
       const {getByText, queryByLabelText} = render(
           <BucketContextProvider>
               <CollabSpaceEntry onContextFinish={() => {}} tag={'div'} metadata={dir}/>
           </BucketContextProvider>
       );
       const renderedDir = getByText(name);
       fireEvent.contextMenu(renderedDir);
       // should not open a context menu
       const contextMenu = queryByLabelText('context-menu');
       expect(contextMenu).toBeFalsy();
   });

   it('is visible on files', () => {
       const [name, absolutePath, bucket] = ['test.py', 'a/test.py', 'test-bucket'];
       const bucketFile = new BucketFile(name, absolutePath, bucket);
       const {getByText, queryByLabelText} = render(
           <BucketContextProvider>
               <CollabSpaceEntry onContextFinish={onContextFinish} tag={'div'} metadata={bucketFile}/>
           </BucketContextProvider>
       );
       const renderedFile = getByText(name);
       fireEvent.contextMenu(renderedFile);
       const contextMenu = queryByLabelText('context-menu');
       expect(contextMenu).toBeTruthy();
       expect(onContextFinish).toBeCalledTimes(0);
   });

   it('provides download mechanism and error if not in a bucket', async () => {
      const [name, absolutePath, bucket] = ['test.py', 'test.py', 'test-bucket'];
      const bucketFile = new BucketFile(name, absolutePath, bucket);
      const {getByText, queryByLabelText} = render(
          <BucketContextProvider>
              <CollabSpaceEntry onContextFinish={() => {}} tag={'div'} metadata={bucketFile}/>
          </BucketContextProvider>
      );
      const renderedFile = getByText(name);
      fireEvent.contextMenu(renderedFile);
      const contextMenu = queryByLabelText('context-menu');
      expect(contextMenu).toBeTruthy();
      // search for download
      const downloadBtn = getByText('Download');
      await waitFor(()=>fireEvent.click(downloadBtn));
      expect(showErrorMessage).toBeCalled(); // file is not in a directory of the browser
   });
});

describe('test context menu UI', () => {
    const renderContextMenu = async () => {
        const {getByText, getByPlaceholderText, queryByLabelText, queryByText} = render(
           <BucketContextProvider>
               <BucketSpace/>
           </BucketContextProvider>
       );
       const bucketInput = getByPlaceholderText('bucket-name');
       expect(bucketInput).toBeTruthy();
       await waitFor(() => {
           fireEvent.change(bucketInput, {target: {value: MOCK_BUCKET}})
       })
       // enter name of the mock bucket
       const bucketInputEl = queryByLabelText('bucket-name-input') as HTMLInputElement;
       expect(bucketInputEl?.value).toEqual(MOCK_BUCKET);
       // connect to the mock bucket
       const connectBtn = getByText('Connect!');
       await waitFor(() => {
           fireEvent.click(connectBtn);
       })
       // open context menu on a file in bucket
       const bucketFile = getByText('foo.py');
       fireEvent.contextMenu(bucketFile);
       // look for download option and click
       const download = queryByText('Download');
       expect(download).toBeTruthy();
       const localDownload = queryByText('Local Download');
       expect(localDownload).toBeTruthy();
       const deleteOption = queryByText('Delete');
       expect(deleteOption).toBeTruthy();
       const rename = queryByText('Rename');
       expect(rename).toBeTruthy();
       const share = queryByText('Share download url');
       expect(share).toBeTruthy();
       return {
           getByText,
           getByPlaceholderText,
           queryByLabelText,
           queryByText,
           options: {
               download: download,
               localDownload: localDownload,
               deleteOption: deleteOption,
               rename: rename,
               share: share
           }
       };
    }

    it('tests UI flow to download on context menu', async () => {
        const ctxMenu = await renderContextMenu();
        await waitFor(() => {
           fireEvent.click(ctxMenu.options.download as HTMLElement);
        });
        expect(ctxMenu.queryByText('Download')).toBeTruthy();
        // context menu should still be visible since there is a pop-up message informing of success or fail
        expect(ctxMenu.queryByLabelText('context-menu')?.style.display).not.toEqual('none');
        expect(queryByText(document.body, 'Success!')).toBeTruthy();
        // close pop-up
        const okBtn = getByText(document.body, 'OK');
        await waitFor(() => fireEvent.click(okBtn));
    });

    it('tests UI flow to local download on context menu', async () => {
        const ctxMenu = await renderContextMenu();
        await waitFor(() => {
           fireEvent.click(ctxMenu.options.localDownload as HTMLElement);
        });
        expect(ctxMenu.queryByText('Local Download')).toBeTruthy();
        // context menu should not be visible after local download
        expect(ctxMenu.queryByLabelText('context-menu')?.style.display).toEqual('none');
    });

    it('tests UI flow to delete on context menu', async () => {
        const ctxMenu = await renderContextMenu();
        await waitFor(() => {
           fireEvent.click(ctxMenu.options.deleteOption as HTMLElement);
        });
        expect(ctxMenu.queryByText('Delete')).toBeTruthy();
        // context menu should still be visible since there is a pop-up message informing of success or fail
        expect(ctxMenu.queryByLabelText('context-menu')?.style.display).not.toEqual('none');
        expect(queryByText(document.body, 'Success!')).toBeTruthy();
        // close pop-up
        const okBtn = getByText(document.body, 'OK');
        await waitFor(() => fireEvent.click(okBtn));
    });

    it('tests UI flow to share on context menu', async () => {
        const ctxMenu = await renderContextMenu();
        await waitFor(() => {
           fireEvent.click(ctxMenu.options.share as HTMLElement);
        });
        // a pop-up with the share url can be found in page
        const msg = getByText(document.body,'Your share URL:');
        expect(msg).toBeTruthy();
        // close pop-up
        const okBtn = getByText(document.body, 'Close');
        await waitFor(() => fireEvent.click(okBtn));
    });

    it('tests UI flow to rename on context menu', async () => {
        const ctxMenu = await renderContextMenu();
        // input for new name of file should not be visible before rename option is clicked
        let renameInput: HTMLInputElement | null = ctxMenu.queryByLabelText('rename-input') as HTMLInputElement;
        expect(renameInput).toBeFalsy()
        // click rename
        await waitFor(() => {
           fireEvent.click(ctxMenu.options.rename as HTMLElement);
        });
        // expect input for new name to be in the dom with current name of file pre-filled
        renameInput = ctxMenu.queryByLabelText('rename-input') as HTMLInputElement;
        expect(renameInput).toBeTruthy();
        expect(renameInput?.value).toEqual('foo.py');
        // change name of file
        fireEvent.change(renameInput, {target: {value: 'bar.py'}});
        renameInput = ctxMenu.queryByLabelText('rename-input') as HTMLInputElement;
        expect(renameInput.value).toEqual('bar.py');
        // submit for rename
        await waitFor(() => fireEvent.keyPress(renameInput as Element, {key: 'Enter'}));
        // input should no longer be visible
        renameInput = ctxMenu.queryByLabelText('rename-input') as HTMLInputElement;
        expect(renameInput).toBeFalsy()
    });
})