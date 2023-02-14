import React, { useEffect, useRef, useState } from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { ContextMenu } from './ContextMenu';
import { fileIcon, folderIcon } from '@jupyterlab/ui-components';
import { DragDownload } from './DragDownload';
import BucketFile = BucketFileBrowser.BucketFile;
import { useBucketContext } from './BucketContext';
import { showErrorMessage } from '@jupyterlab/apputils';
import { useToolTip } from './Tooltip';

export function CollabSpaceEntry({
  tag,
  metadata,
  onClick,
  onContextFinish
}: CollabSpaceEntry.IProps): JSX.Element {
  const [renameActive, setRenameActive] = useState<boolean>(false);

  const bucketBrowser = useBucketContext().fileBrowser;

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [ToolTip, setMessage, setTooltipVisible] = useToolTip({
    hasLoader: true
  });

  useEffect(() => {
    const onEnter = async (ev: KeyboardEvent) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') {
        ev.preventDefault();
        setTooltipVisible(true);
        setMessage('Renaming file...');
        await renameFile();
        setTooltipVisible(false);
        nameInputRef.current?.removeEventListener('keypress', onEnter);
        setRenameActive(false);
      }
    };
    if (renameActive) {
      nameInputRef.current?.addEventListener('keypress', onEnter);
    }

    return () => nameInputRef.current?.removeEventListener('keypress', onEnter);
  }, [renameActive]);

  const renameFile = async () => {
    const file = bucketBrowser.currentDirectory?.files.get(metadata.name);
    if (!file) {
      const errMessage = `File ${metadata.name} could not be found!`;
      showErrorMessage('ERROR', errMessage).then(() =>
        console.error(errMessage)
      );
      return;
    }
    try {
      const newName = nameInputRef.current
        ? nameInputRef.current.value
        : metadata.name;
      await file.rename(newName);
      await onContextFinish();
    } catch (e) {
      await showErrorMessage('Failed to rename', e);
    }
  };
  return (
    <Private.Wrapper tag={tag}>
      {metadata.isFile ? (
        <fileIcon.react
          tag="span"
          right={'7px'}
          className={'jp-DirListing-itemIcon'}
        />
      ) : (
        <folderIcon.react
          tag="span"
          right={'7px'}
          className={'jp-DirListing-itemIcon'}
        />
      )}
      {/* Add context menu only to files */}
      {metadata.isFile ? (
        <ContextMenu
          name={metadata.name}
          onContextFinish={onContextFinish}
          renameAction={() => setRenameActive(true)}
        >
          <ToolTip />
          <DragDownload file={metadata as BucketFile}>
            {renameActive ? (
              <input
                aria-label={'rename-input'}
                defaultValue={metadata.name}
                ref={nameInputRef}
              />
            ) : (
              <p onClick={onClick}>{metadata.name}</p>
            )}
          </DragDownload>
        </ContextMenu>
      ) : (
        <p onClick={onClick} style={{ cursor: 'pointer' }}>
          {metadata.name}
        </p>
      )}
    </Private.Wrapper>
  );
}

export namespace CollabSpaceEntry {
  export interface IProps {
    tag: 'li' | 'div';
    metadata: BucketFileBrowser.IBrowserEntry;
    onClick?: () => void;
    onContextFinish: () => void;
  }
}

namespace Private {
  export type WrapperProps = {
    tag: 'li' | 'div';
  };

  export const Wrapper: React.FC<WrapperProps> = ({
    tag,
    children
  }): JSX.Element => {
    return (
      <>
        {tag === 'li' ? (
          <li className={'bucket-BrowserListItem'}>{children}</li>
        ) : (
          <div>{children}</div>
        )}
      </>
    );
  };
}
