import React from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { ContextMenu } from './ContextMenu';
import { fileIcon, folderIcon } from '@jupyterlab/ui-components';
import { DragDownload } from './DragDownload';
import BucketFile = BucketFileBrowser.BucketFile;

export function CollabSpaceEntry({
  tag,
  metadata,
  onClick,
  onContextFinish
}: CollabSpaceEntry.IProps): JSX.Element {
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
        <ContextMenu name={metadata.name} onContextFinish={onContextFinish}>
          <DragDownload file={metadata as BucketFile}>
            <p onClick={onClick} style={{ cursor: 'pointer' }}>
              {metadata.name}
            </p>
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
