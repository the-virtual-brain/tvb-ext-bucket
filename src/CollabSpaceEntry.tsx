import React from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { ContextMenu } from './ContextMenu';
import { fileIcon, folderIcon } from '@jupyterlab/ui-components';

export function CollabSpaceEntry({
  tag,
  metadata,
  onClick
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
        <ContextMenu name={metadata.name}>
          <p onClick={onClick} style={{ cursor: 'pointer' }}>
            {metadata.name}
          </p>
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
    metadata: BucketFileBrowser.IBucketEntry;
    onClick?: () => void;
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
