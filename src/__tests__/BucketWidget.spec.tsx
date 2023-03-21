import {BucketSpace, BucketWidget} from "../BucketWidget";
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import React from "react";
import {BucketContextProvider, useBucketContext} from "../BucketContext";
import {getError} from "./testUtils";
import {ContextError} from "../exceptions";

jest.mock('../handler', () => {
  return {
    __esModule: true,
    requestAPI: jest
      .fn()
      .mockImplementation((_url: string, _init, _settings) =>
      {
          if (_url.includes('buckets_list')) {
              return Promise.resolve(['bucket1', 'test_bucket', 'bucket_2'])
          }
          return Promise.resolve(filesData)
      })
  };
});

const filesData = {
    success: true,
    message: 'test',
    files: ['file1.txt', 'file2.txt', 'dir1/dir2/file1.py']
}

afterEach(cleanup);

describe('Test BucketWidget.tsx', () => {
    it('tests BucketSpace', async () => {
        const {getByText, } = render(<BucketContextProvider><BucketSpace/></BucketContextProvider>);
        expect(getByText(/Connect!/i)).toBeTruthy();
        await waitFor(() => fireEvent.click(getByText(/Connect!/i)));
        expect(getByText(/file1.txt/i)).toBeTruthy();
        expect(getByText(/file2.txt/i)).toBeTruthy();
        expect(getByText(/dir1/i)).toBeTruthy();
    });

    it('Tests bucket input change', () => {
        const {getByLabelText} = render(<BucketContextProvider><BucketSpace/></BucketContextProvider>);
        const input: HTMLInputElement = getByLabelText('bucket-name-input') as HTMLInputElement;
        fireEvent.change(input, {target: {value: 'test-bucket'}});
        expect(input.value).toBe('test-bucket');
    });

    it('Tests breadcrumbs display when navigating', async () => {
        const {getByText, getByLabelText} = render(<BucketContextProvider><BucketSpace/></BucketContextProvider>);
        await waitFor(() => fireEvent.click(getByText(/Connect!/i)));
        const subdir = getByText('dir1');
        await waitFor(() => fireEvent.click(subdir));
        const breadcrumb = getByLabelText('breadcrumb-0');
        expect(breadcrumb.className).toBe('bucket-BreadCrumbs-Item');
    });

    it('Tests breadcrumb navigation', async () => {
        const {queryByLabelText, getByText} = render(<BucketContextProvider><BucketSpace/></BucketContextProvider>);
        // connect to bucket
        await waitFor(() => fireEvent.click(getByText(/Connect!/i)));
        // navigate to subdir 'dir1'
        let subdir = getByText('dir1');
        await waitFor(() => fireEvent.click(subdir));
        //dir1 should no longer be visible in browser only in breadcrumbs
        const subdirAfterNav = screen.queryByText('dir1');
        expect(subdirAfterNav).toBeFalsy();
        expect(queryByLabelText('breadcrumb-0')).toBeTruthy();
        // navigate to subdir 'dir2'
        const subdir2 = getByText('dir2');
        await waitFor(() => fireEvent.click(subdir2));
        // 'dir2' should not be visible in browser
        const dir2AfterBrowse = screen.queryByText('dir2');
        expect(dir2AfterBrowse).toBeFalsy();
        // breadcrumbs should be 'dir1/dir2'
        const subdir1Breadcrumb = queryByLabelText('breadcrumb-0');
        expect(subdir1Breadcrumb).toBeTruthy();
        const subdir2Breadcrumb = queryByLabelText('breadcrumb-1');
        expect(subdir2Breadcrumb).toBeTruthy();
        // navigate to breadcrumb of dir1
        await waitFor(() => fireEvent.click(subdir1Breadcrumb!));
        // 'dir2' should now be visible again in browser
        subdir = getByText('dir2');
        expect(subdir).toBeTruthy();
    });
});

describe('Test BucketContext', () => {
    it('throws error when out of context', async () => {
        const WrongComponent = () => {
            const bucket = useBucketContext();
            return (
                <div>{bucket}</div>
            )
        }
        const err = await getError(() => render(<WrongComponent/>));
        expect(err).toBeInstanceOf(ContextError);
    })
});

describe('Test BucketWidget', () => {
   it('Tests BucketWidget renders as react element', () => {
       const bw = new BucketWidget();
       expect(bw.hasClass('tvb-bucketWidget')).toBeTruthy();
       // @ts-ignore
       const rendered = bw.render();
       expect(rendered?.type).toBe('div');
   })
});