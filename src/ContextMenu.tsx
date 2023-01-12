import React, { useCallback, useState, useEffect } from 'react';
import { downloadIcon } from '@jupyterlab/ui-components';
import { ContextMenuItem } from './ContextMenuItem';
import { useBucketContext } from './BucketContext';
import { showErrorMessage } from '@jupyterlab/apputils';

export const ContextMenu: React.FC<ContextMenuNamespace.IProps> = ({
  name,
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
        </ul>
      </div>
    </div>
  );
};

export namespace ContextMenuNamespace {
  export interface IProps {
    name: string;
  }
}
