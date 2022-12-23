import React, { useCallback, useState } from 'react';
import { requestAPI } from './handler';
import { showErrorMessage, showDialog, Dialog } from '@jupyterlab/apputils';
import { downloadIcon } from '@jupyterlab/ui-components';
import { ContextMenuItem } from './ContextMenuItem';
import { useBucketContext } from './BucketContext';

export const ContextMenu: React.FC<ContextMenu.IProps> = ({
  name,
  children
}): JSX.Element => {
  const [show, setShow] = useState<boolean>(false);
  const browser = useBucketContext().fileBrowser;

  const handleContext = useCallback(
    ev => {
      ev.preventDefault();
      setShow(prevState => !prevState);
    },
    [setShow]
  );

  const download = useCallback(async () => {
    try {
      const filePath = `${browser.breadcrumbs.join('/')}/${name}`;

      const resp = await requestAPI<Private.IDownloadResponse>(
        `download?file=${encodeURIComponent(filePath)}&bucket=${browser.bucket}`
      );
      await showDialog({
        title: resp.success ? 'Success!' : 'Failed!',
        body: `File ${name} was ${resp.success ? '' : 'not'} downloaded! \n ${
          resp.message ? resp.message : ''
        }`,
        buttons: [Dialog.okButton({ label: 'OK' })]
      });
    } catch (err) {
      await showErrorMessage('Something went wrong!', err);
    }
  }, [name]);

  return (
    <div
      onContextMenu={handleContext}
      className={'bucket-ContextMenu-container'}
    >
      {children}
      {show && (
        <div className={'bucket-ContextMenu'}>
          <ul>
            <ContextMenuItem
              label={'Download'}
              action={download}
              icon={downloadIcon}
            />
          </ul>
        </div>
      )}
    </div>
  );
};

export namespace ContextMenu {
  export interface IProps {
    name: string;
  }
}

namespace Private {
  export interface IDownloadResponse {
    success: boolean;
    message: string;
  }
}
