import {BucketSpace} from "../BucketWidget";
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import React from "react";

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
        const {getByText} = render(<BucketSpace/>)
        expect(getByText(/Connect!/i)).toBeTruthy();
        await waitFor(() => fireEvent.click(getByText(/Connect!/i)));
        // fireEvent.click(getByText(/Connect!/i));
        expect(getByText(/file1.txt/i)).toBeTruthy();
        expect(getByText(/file2.txt/i)).toBeTruthy();
        expect(getByText(/dir1/i)).toBeTruthy();
    })
})