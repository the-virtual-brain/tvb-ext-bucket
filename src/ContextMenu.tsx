import React, { useCallback, useState, useEffect } from 'react';
import {
  downloadIcon,
  editIcon,
  closeIcon,
  linkIcon
} from '@jupyterlab/ui-components';
import { ContextMenuItem } from './ContextMenuItem';
import { useBucketContext } from './BucketContext';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';

export const ContextMenu: React.FC<ContextMenuNamespace.IProps> = ({
  name,
  onContextFinish,
  renameAction,
  children
}): JSX.Element => {
  const [show, setShow] = useState<boolean>(false);
  const browser = useBucketContext().fileBrowser;

  useEffect(() => {
    const closeMenu = () => setShow(false);
    document.addEventListener('click', closeMenu);

    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const handleContext = useCallback(
    ev => {
      ev.preventDefault();
      setShow(prevState => !prevState);
    },
    [setShow]
  );

  const download = useCallback(async () => {
    const file = browser.currentDirectory?.files.get(name);
    if (file) {
      await file.download();
    } else {
      await showErrorMessage(
        'Download failed!',
        `Can't find file ${name} in directory ${browser.currentDirectory?.name}`
      );
    }
  }, [name]);

  const localDownload = useCallback(async () => {
    const file = browser.currentDirectory?.files.get(name);
    if (file) {
      const url = await file.getDownloadUrl();
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } else {
      await showErrorMessage(
        'Download failed!',
        `Can't find file ${name} in directory ${browser.currentDirectory?.name}. Please refresh and try again!`
      );
    }
  }, [name]);

  const deleteFile = useCallback(async () => {
    const file = browser.currentDirectory?.files.get(name);
    if (!file) {
      await showErrorMessage(
        'Deletion failed!',
        `Can't find file ${name} in directory ${browser.currentDirectory?.name}. Please refresh and try again!`
      );
    } else {
      const resp = await file.delete();
      if (!resp) {
        return;
      }
      await showDialog({
        title: resp.success ? 'Success!' : 'Failed!',
        body: `File ${name} was ${resp.success ? '' : 'not'} deleted! \n ${
          resp.message ? resp.message : ''
        }`,
        buttons: [Dialog.okButton({ label: 'OK' })]
      });
    }
  }, [name]);

  const getShareLink = useCallback(async () => {
    let shareLink = '';
    try {
      const bucketFile = browser.currentDirectory?.files.get(name);
      if (!bucketFile) {
        await showErrorMessage(
          'ERROR',
          `Could not get details on file ${name}. Please refresh and try again!`
        );
        return;
      }
      shareLink = await bucketFile.getDownloadUrl();
      await showDialog({
        title: 'Your share URL:',
        body: (
          <>
            <a href={shareLink} className={'bucket-ShareLink'}>
              {shareLink}
            </a>
            <p>Copy and paste this url in a browser to download the file!</p>
            <p style={{ color: 'red' }}>
              * If this bucket is private this link will expire very soon.
            </p>
          </>
        ),
        buttons: [Dialog.okButton({ label: 'Close' })]
      });
    } catch (e) {
      await showErrorMessage('ERROR', e);
    }
  }, [name]);

  return (
    <div
      onContextMenu={handleContext}
      className={'bucket-ContextMenu-container'}
    >
      {children}
      <div
        className={'bucket-ContextMenu'}
        aria-label={'context-menu'}
        onClick={ev => ev.stopPropagation()}
        style={{ display: show ? 'block' : 'none' }}
      >
        <ul>
          <ContextMenuItem
            label={'Download'}
            action={download}
            icon={downloadIcon}
          />
          <ContextMenuItem
            label={'Local Download'}
            action={localDownload}
            icon={downloadIcon}
          />
          <ContextMenuItem
            label={'Delete'}
            action={deleteFile}
            icon={closeIcon}
            onContextFinish={onContextFinish}
          />
          <ContextMenuItem
            label={'Rename'}
            action={() => {
              renameAction();
              setShow(false);
            }}
            icon={editIcon}
          />
          <ContextMenuItem
            label={'Share download url'}
            action={getShareLink}
            icon={linkIcon}
          />
        </ul>
      </div>
    </div>
  );
};

export namespace ContextMenuNamespace {
  export interface IProps {
    name: string;
    onContextFinish: () => void;
    renameAction: () => void;
  }
}
