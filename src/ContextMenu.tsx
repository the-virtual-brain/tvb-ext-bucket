import React, { useCallback, useState } from 'react';
import { requestAPI } from './handler';
import { showErrorMessage, showDialog, Dialog } from '@jupyterlab/apputils';
import { downloadIcon } from '@jupyterlab/ui-components';
import { ContextMenuItem } from './ContextMenuItem';

export const ContextMenu: React.FC<ContextMenu.IProps> = ({
  name,
  children
}): JSX.Element => {
  const [show, setShow] = useState<boolean>(false);

  const handleContext = useCallback(
    ev => {
      ev.preventDefault();
      setShow(prevState => !prevState);
    },
    [setShow]
  );

  const download = useCallback(async () => {
    try {
      const resp = await requestAPI<Private.IDownloadResponse>(
        `download?file=${name}`
      );
      await showDialog({
        title: resp.success ? 'File downloaded!' : 'Failed!',
        body: `File ${name}} was downloaded!`,
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
