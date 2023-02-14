import React, { useCallback, useState } from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { DownloadAnimation } from './FileTransferAnimations';

export const DragDownload: React.FC<DragDownloadNamespace.IProps> = ({
  children,
  file
}) => {
  const [downloading, setDownloading] = useState<boolean>(false);

  /**
   * callback to check if the drag end event is triggered in the area
   * where the jupyter lab file browser is located
   */
  const isInJpBrowserDropZone = useCallback(dragEndEvent => {
    return dragEndEvent.clientX > 20 && dragEndEvent.clientX < 280;
  }, []);

  const handleDragEnd = useCallback(async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    if (isInJpBrowserDropZone(ev)) {
      setDownloading(true);
      await file.download();
      setDownloading(false);
    }
  }, []);

  return (
    <div
      draggable={!downloading}
      onDragEnd={handleDragEnd}
      className={'align-flex-horizontal'}
    >
      {children}
      {downloading && <DownloadAnimation />}
    </div>
  );
};

export namespace DragDownloadNamespace {
  import BucketFile = BucketFileBrowser.BucketFile;

  export interface IProps {
    file: BucketFile;
  }
}
