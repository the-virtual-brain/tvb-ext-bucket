import { BucketFileBrowser } from './bucketFileBrowser';
import { requestAPI } from './handler';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';

export const downloadFile = async (
  fileName: string,
  browser: BucketFileBrowser
) => {
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

namespace Private {
  export interface IDownloadResponse {
    success: boolean;
    message: string;
  }
}
