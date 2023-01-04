import React, { useCallback } from 'react';
import { downloadFile } from './utils';
import { useBucketContext } from './BucketContext';

export const DragDownload: React.FC<DragDownload.IProps> = ({
  children,
  name
}) => {
  const browser = useBucketContext().fileBrowser;

  const isInJpBrowserDropZone = useCallback(dragEndEvent => {
    if (dragEndEvent.clientX > 20 && dragEndEvent.clientX < 280) {
      console.log('SHOULD DOWNLOAD!');
      return true;
    }
    console.log('SHOULD NOT DOWNLOAD!');
    return false;
  }, []);

  const handleDragEnd = useCallback(ev => {
    ev.preventDefault();
    ev.stopPropagation();
    if (isInJpBrowserDropZone(ev)) {
      console.log('START DOWNLOAD!');
      downloadFile(name, browser).then(() => console.log('FINISHED!'));
    }
  }, []);

  return (
    <div draggable={true} onDragEnd={handleDragEnd}>
      {children}
    </div>
  );
};

export namespace DragDownload {
  export interface IProps {
    name: string;
  }
}
