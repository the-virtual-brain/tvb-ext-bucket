import React, { useCallback, useState } from 'react';
import { downloadIcon } from '@jupyterlab/ui-components';
import { ContextMenuItem } from './ContextMenuItem';
import { useBucketContext } from './BucketContext';
import { downloadFile } from './utils';

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
    await downloadFile(name, browser);
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
