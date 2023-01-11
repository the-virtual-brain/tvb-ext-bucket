import {BucketSpace} from "../BucketWidget";
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import React from "react";
import {BucketContextProvider, useBucketContext} from "../BucketContext";
import {getError} from "./testUtils";
import {ContextError} from "../exceptions";

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

afterEach(cleanup);

describe('Test BucketWidget.tsx', () => {
    it('tests BucketSpace', async () => {
        const {getByText} = render(<BucketContextProvider><BucketSpace/></BucketContextProvider>)
        expect(getByText(/Connect!/i)).toBeTruthy();
        await waitFor(() => fireEvent.click(getByText(/Connect!/i)));
        expect(getByText(/file1.txt/i)).toBeTruthy();
        expect(getByText(/file2.txt/i)).toBeTruthy();
        expect(getByText(/dir1/i)).toBeTruthy();
    })
})

describe('Test BucketContext', () => {
    it('throws error when out of context', async () => {
        const WrongComponent = () => {
            const bucket = useBucketContext();
            return (
                <div>{bucket.bucketName}</div>
            )
        }
        const err = await getError(() => render(<WrongComponent/>));
        expect(err).toBeInstanceOf(ContextError);
    })
});