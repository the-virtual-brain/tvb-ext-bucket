import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { Drag } from '@lumino/dragdrop';
import { useBucketContext } from './BucketContext';
import { JpFileBrowser } from './JpFileBrowser';
import { MimeData } from '@lumino/coreutils';
import { Contents } from '@jupyterlab/services';
import { Dialog, showDialog } from '@jupyterlab/apputils';

const source: { drag: null | Drag } = { drag: null };

export const DropZone: React.FC = () => {
  const [mode, setMode] = useState<'default' | 'hover'>('default');
  const [uploading, setUploading] = useState<boolean>(false);

  const dropZoneRef = useRef<HTMLDivElement>(null);

  const bucketBrowser = useBucketContext().fileBrowser;

  /**
   * Validate if source of a drag event is a file in jp filebrowser and start the custom drag
   * event with data about the file
   */
  const handleJpBrowserDragStart = useCallback((ev: MouseEvent) => {
    const dragSourceElement: HTMLElement | null = ev.target as HTMLElement;
    const possibleTargets = JpFileBrowser.current?.selectedItems();

    if (possibleTargets === null || possibleTargets === undefined) {
      return;
    }
    const items: Array<Contents.IModel> = [];

    let isValidDragSource = false;

    let item = possibleTargets?.next();
    while (item) {
      items.push(item);
      if (item.name === dragSourceElement?.innerText) {
        isValidDragSource = true;
      }
      item = possibleTargets?.next();
    }

    console.log('items: ', items);
    if (!isValidDragSource) {
      showDialog({
        title: 'Not allowed!',
        body: 'This operation is not yet supported!',
        buttons: [Dialog.okButton({ label: 'OK' })]
      });
      return;
    }
    const dragSource = items[0];
    source.drag = new Drag({
      mimeData: new MimeData(),
      source: items[0],
      proposedAction: 'copy'
    });
    source.drag.mimeData.setData('text/plain', dragSource);
  }, []);

  const jpEventsHandler = useMemo(() => {
    return {
      handleEvent: (ev: Event): void => {
        console.log('handling: ', ev.type);
        switch (ev.type) {
          case 'lm-dragenter':
            jpEventsHandler._dragEnter(ev);
            break;
          case 'lm-dragover':
            jpEventsHandler._dragOver(ev);
            break;
          case 'lm-drop':
            jpEventsHandler._drop(ev);
            break;
        }
      },
      _dragEnter: (ev: Event): void => {
        ev.preventDefault();
        setMode('hover');
        console.log('lm-dragenter : should add drop target class');
      },
      _dragOver: (ev: Event): void => {
        ev.preventDefault();
        ev.stopPropagation();
        setMode('hover');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ev.dropAction = 'copy'; // needed to trigger lm-drop
      },
      _drop: (ev: Event): void => {
        ev.preventDefault();
        ev.stopPropagation();
        console.log('DROP');
        setMode('default');
        setUploading(true);
        const [path, name] = [
          source.drag?.source.path,
          source.drag?.source.name
        ];
        bucketBrowser.currentDirectory?.upload(path, name);
        setUploading(false);
      }
    };
  }, []);

  useEffect(() => {
    console.log('set events');
    dropZoneRef.current?.addEventListener('lm-dragenter', jpEventsHandler);
    dropZoneRef.current?.addEventListener('lm-dragleave', jpEventsHandler);
    dropZoneRef.current?.addEventListener('lm-dragover', jpEventsHandler);
    dropZoneRef.current?.addEventListener('lm-drop', jpEventsHandler);
    const node = JpFileBrowser.current?.node;
    node?.addEventListener('mousedown', handleJpBrowserDragStart);

    // cleanup on unmount
    return () => {
      console.log('removing events');
      node?.removeEventListener('mousedown', handleJpBrowserDragStart);
      dropZoneRef.current?.removeEventListener('lm-dragenter', jpEventsHandler);
      dropZoneRef.current?.removeEventListener('lm-dragleave', jpEventsHandler);
      dropZoneRef.current?.removeEventListener('lm-dragover', jpEventsHandler);
      dropZoneRef.current?.removeEventListener('lm-drop', jpEventsHandler);
    };
  }, []);

  const nativeDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setMode('hover');
  }, []);

  const nativeDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('native drag end');
    setMode('default');
  }, []);

  const nativeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('native drop');
    setMode('default');
  }, []);

  const dragEnter = useCallback((e: Event) => {
    e.preventDefault();
    Drag.overrideCursor('pointer');
    setMode('hover');
  }, []);

  const dragOver = useCallback((e: Event) => {
    e.preventDefault();
    Drag.overrideCursor('pointer');
    setMode('hover');
  }, []);

  const dragLeave = useCallback((e: Event) => {
    e.preventDefault();
    Drag.overrideCursor('auto');
    setMode('default');
  }, []);

  useEffect(() => {
    if (!dropZoneRef.current) {
      return;
    }
    dropZoneRef.current.addEventListener('lm-dragenter', dragEnter);
    dropZoneRef.current.addEventListener('lm-dragover', dragOver);
    dropZoneRef.current.addEventListener('lm-dragleave', dragLeave);

    return () => {
      dropZoneRef.current?.removeEventListener('lm-dragenter', dragEnter);
      dropZoneRef.current?.removeEventListener('lm-dragover', dragOver);
      dropZoneRef.current?.removeEventListener('lm-dragleave', dragLeave);
    };
  }, [dropZoneRef]);

  return (
    <div
      className={`bucket-DropZone ${mode}`}
      ref={dropZoneRef}
      onDragOver={nativeDragOver}
      onDragLeave={nativeDragLeave}
      onDrop={nativeDrop}
      style={{ display: bucketBrowser.currentDirectory ? 'block' : 'none' }}
    >
      {uploading ? (
        <p className={'bucket-text-info'}>Uploading files...</p>
      ) : (
        <p className={'bucket-text-info'}>Drop your files here for upload.</p>
      )}
    </div>
  );
};
