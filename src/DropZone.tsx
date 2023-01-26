import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { Drag, IDragEvent } from '@lumino/dragdrop'; // must use the deprecated interface
import { useBucketContext } from './BucketContext';
import { JpFileBrowser } from './JpFileBrowser';
import { MimeData } from '@lumino/coreutils';
import { Contents } from '@jupyterlab/services';
import { Dialog, showDialog } from '@jupyterlab/apputils';

const source: { drag: null | Drag } = { drag: null };

export const DropZone: React.FC<DropZone.IProps> = ({
  show,
  finishAction
}: DropZone.IProps) => {
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

    if (!isValidDragSource) {
      showDialog({
        title: 'Not allowed!',
        body: 'This operation is not yet supported!',
        buttons: [Dialog.okButton({ label: 'OK' })]
      });
      return;
    }

    const dragSource = items[0];
    // create the drag initiator
    const initiator: IDragInitiator = {
      source: dragSource,
      action: async () => {
        console.log('Calling source action()');
        const [path, name] = [dragSource.path, dragSource.name];
        await bucketBrowser.currentDirectory?.upload(path, name);
      }
    };
    source.drag = new Drag({
      mimeData: new MimeData(),
      source: initiator,
      proposedAction: 'copy'
    });
    source.drag.mimeData.setData('text/plain', JSON.stringify(dragSource));
    source.drag.start(ev.clientX, ev.clientY);
  }, []);

  const jpEventsHandler = useMemo(() => {
    const handler = {
      handleEvent: (ev: Event): void => {
        console.log('handling: ', ev.type);
        switch (ev.type) {
          case 'lm-dragenter':
            handler._dragEnter(ev as IDragEvent);
            break;
          case 'lm-dragover':
            handler._dragOver(ev as IDragEvent);
            break;
          case 'lm-drop':
            handler._drop(ev as IDragEvent);
            break;
          case 'lm-dragleave':
            handler._dragLeave(ev as IDragEvent);
            break;
        }
      },
      _dragEnter: (ev: IDragEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        setMode('hover');
        Drag.overrideCursor('pointer');
      },
      _dragOver: (ev: IDragEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        ev.dropAction = ev.proposedAction; // needed to trigger lm-drop
        Drag.overrideCursor('pointer');
        setMode('hover');
      },
      _dragLeave: (ev: IDragEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        Drag.overrideCursor('auto');
        setMode('default');
      },
      _drop: async (ev: IDragEvent): Promise<void> => {
        ev.preventDefault();
        ev.stopPropagation();
        console.log('DROP');
        console.log('drop source: ', ev.source);
        console.log('drop mimeData: ', ev.mimeData.getData('text/plain'));
        setUploading(true);
        if (ev.source && (ev.source as IDragInitiator).action) {
          await ev.source.action();
          await finishAction();
        } else {
          console.log('drag initiator does not provide an action!');
        }

        Drag.overrideCursor('auto');
        setMode('default');
      }
    };

    return handler;
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
    console.log('native drag over');
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

  return (
    <div
      className={`bucket-DropZone ${mode}`}
      ref={dropZoneRef}
      onDragOver={nativeDragOver}
      onDragLeave={nativeDragLeave}
      onDrop={nativeDrop}
      style={{
        display: bucketBrowser.currentDirectory || show ? 'block' : 'none'
      }}
    >
      {uploading ? (
        <p className={'bucket-text-info'}>Uploading files...</p>
      ) : (
        <p className={'bucket-text-info'}>Drop your files here for upload.</p>
      )}
    </div>
  );
};

export namespace DropZone {
  export interface IProps {
    show: boolean;
    finishAction: Callable | AsyncCallable;
  }
}

export interface IDragInitiator {
  source: any;
  action: AsyncCallable | Callable | undefined;
}

export type AsyncCallable = () => Promise<any>;
export type Callable = () => any;
