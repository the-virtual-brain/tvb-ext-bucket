import { BucketFileBrowser } from './bucketFileBrowser';
import { requestAPI } from './handler';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';

/**
 * utility function to download a file
 * @param fileName - file to download
 * @param browser - file browser which holds the breadcrumbs to the file
 */
export const downloadFile = async (
  fileName: string,
  browser: BucketFileBrowser
): Promise<void> => {
  try {
    let filePath = fileName;
    if (browser.breadcrumbs.length > 0) {
      filePath = `${browser.breadcrumbs.join('/')}/${fileName}`;
    }

    const resp = await requestAPI<Private.IDownloadResponse>(
      `download?file=${encodeURIComponent(filePath)}&bucket=${browser.bucket}`
    );
    await showDialog({
      title: resp.success ? 'Success!' : 'Failed!',
      body: `File ${fileName} was ${resp.success ? '' : 'not'} downloaded! \n ${
        resp.message ? resp.message : ''
      }`,
      buttons: [Dialog.okButton({ label: 'OK' })]
    });
  } catch (err) {
    await showErrorMessage('Something went wrong!', err);
  }
};

/**
 * Utility function to validate a file name
 * @param fileName
 */
export const isValidFileName = (fileName: string): boolean => {
  const rg1 = /^[^\\/:*?"<>|]+$/; // forbidden characters \ / : * ? " < > |
  const rg2 = /.*[^.]$/; // must not end with .
  const rg3 = /^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names

  return rg1.test(fileName) && rg2.test(fileName) && !rg3.test(fileName);
};

namespace Private {
  export interface IDownloadResponse {
    success: boolean;
    message: string;
  }
}
