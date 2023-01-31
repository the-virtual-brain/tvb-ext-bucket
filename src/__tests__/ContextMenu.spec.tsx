import {fireEvent, render, waitFor} from "@testing-library/react";
import {CollabSpaceEntry} from "../CollabSpaceEntry";
import {BucketFileBrowser} from "../bucketFileBrowser";
import BucketDirectory = BucketFileBrowser.BucketDirectory;
import React from "react";
import BucketFile = BucketFileBrowser.BucketFile;
import { BucketContextProvider } from "../BucketContext";
import {showErrorMessage} from "@jupyterlab/apputils";

jest.mock('../handler', () => {
  return {
    __esModule: true,
    requestAPI: jest
      .fn()
      .mockImplementation((_url, _init, _settings) => Promise.resolve(downloadSuccess))
  };
});

const downloadSuccess = {
    success: true,
    message: 'Download success'
}

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
            .mockImplementation(async (_options: IOptions) => Promise.resolve(undefined)),
        showErrorMessage: jest
            .fn()
            .mockImplementation( async (_options: IErrorOptions) => Promise.resolve(undefined)),
    }
});

describe('Test ContextMenu', () => {
   it('is not visible on folders', () => {
       const [name, contents, bucket] = ['test', ['test.py'], 'test-bucket'];
       const dir = new BucketDirectory(name, contents, bucket);
       const {getByText, queryByLabelText} = render(<CollabSpaceEntry onContextFinish={() => {}} tag={'div'} metadata={dir}/>);
       const renderedDir = getByText(name);
       fireEvent.contextMenu(renderedDir);
       // should not open a context menu
       const contextMenu = queryByLabelText('context-menu');
       expect(contextMenu).toBeFalsy();
   });

   it('is visible on files', () => {
       const [name, absolutePath, bucket] = ['test.py', 'test.py', 'test-bucket'];
       const bucketFile = new BucketFile(name, absolutePath, bucket);
       const {getByText, queryByLabelText} = render(<BucketContextProvider><CollabSpaceEntry onContextFinish={() => {}} tag={'div'} metadata={bucketFile}/></BucketContextProvider>);
       const renderedFile = getByText(name);
       fireEvent.contextMenu(renderedFile);
       const contextMenu = queryByLabelText('context-menu');
       expect(contextMenu).toBeTruthy();
   });

   it('provides download mechanism', async () => {
      const [name, absolutePath, bucket] = ['test.py', 'test.py', 'test-bucket'];
      const bucketFile = new BucketFile(name, absolutePath, bucket);
      const {getByText, queryByLabelText} = render(<BucketContextProvider><CollabSpaceEntry onContextFinish={() => {}} tag={'div'} metadata={bucketFile}/></BucketContextProvider>);
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