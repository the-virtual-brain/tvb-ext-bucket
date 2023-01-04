import React, { useCallback, useState } from 'react';
import { downloadFile } from './utils';
import { useBucketContext } from './BucketContext';

export const DragDownload: React.FC<DragDownload.IProps> = ({
  children,
  name
}) => {
  const [downloading, setDownloading] = useState<boolean>(false);

  const browser = useBucketContext().fileBrowser;

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
      await downloadFile(name, browser);
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
      {downloading && (
        <span className={'bucket-DownloadAnimation'}>
          <i className={'fa fa-arrow-down'} />
        </span>
      )}
    </div>
  );
};

export namespace DragDownload {
  export interface IProps {
    name: string;
  }
}
