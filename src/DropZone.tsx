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
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { UploadAnimation } from './FileTransferAnimations';

export const DropZone: React.FC<DropZone.IProps> = ({
  show,
  finishAction
}: DropZone.IProps) => {
  const [mode, setMode] = useState<'default' | 'hover'>('default');
  const [uploading, setUploading] = useState<boolean>(false);

  // is needed in memoized values or callbacks to avoid
  // adding 'uploading' state to their dependency array
  const uploadingRef = useRef<boolean>(uploading);
  // keep uploadingRef in sync with uploading state
  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  // const dragRef = useRef<Drag | null>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);

  const bucketBrowser = useBucketContext().fileBrowser;

  const notAllowedUpload = useMemo(() => {
    return {
      title: 'Not allowed!',
      error: 'Please wait for the previous upload to finish!'
    };
  }, []);

  /**
   * Validate if source of a drag event is a file in jp filebrowser and start the custom drag
   * event with data about the file
   */
  const handleJpBrowserDragStart = useCallback((ev: MouseEvent) => {
    // if right click don't start drag
    if (ev.button === 2) {
      return;
    }
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
      console.warn('Did not start a drag operation!');
      return;
    }

    const dragSource = items[0];
    // create the drag initiator
    const initiator: IDragInitiator = {
      source: dragSource,
      action: async () => {
        const [path, name] = [dragSource.path, dragSource.name];
        await bucketBrowser.currentDirectory?.upload(path, name);
      }
    };
    const drag = new Drag({
      mimeData: new MimeData(),
      source: initiator,
      proposedAction: 'copy'
    });
    drag.mimeData.setData('text/plain', JSON.stringify(dragSource));
    drag.start(ev.clientX, ev.clientY).then(() => console.log('drag ended'));
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
            handler
              ._drop(ev as IDragEvent)
              .then(() => console.log('drop handled'));
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
        if (uploadingRef.current) {
          await showErrorMessage(
            notAllowedUpload.title,
            notAllowedUpload.error
          );
          return;
        }
        setUploading(true);
        if (ev.source && (ev.source as IDragInitiator).action) {
          await ev.source.action();
          await finishAction();
        } else {
          console.warn(
            'Did not upload file to bucket since drag initiator does not provide an action!'
          );
        }

        Drag.overrideCursor('auto');
        setMode('default');
        setUploading(false);
      }
    };

    return handler;
  }, []);

  useEffect(() => {
    dropZoneRef.current?.addEventListener('lm-dragenter', jpEventsHandler);
    dropZoneRef.current?.addEventListener('lm-dragleave', jpEventsHandler);
    dropZoneRef.current?.addEventListener('lm-dragover', jpEventsHandler);
    dropZoneRef.current?.addEventListener('lm-drop', jpEventsHandler);
    const node = JpFileBrowser.current?.node;
    node?.addEventListener('mousedown', handleJpBrowserDragStart);

    // cleanup on unmount
    return () => {
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
    setMode('default');
  }, []);

  const nativeDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadingRef.current) {
      await showErrorMessage(notAllowedUpload.title, notAllowedUpload.error);
      return;
    }
    setUploading(true);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (e.dataTransfer.files.length > 1) {
        await showErrorMessage(
          'Unsupported',
          'Currently you can only upload a file at a time!'
        );
      } else {
        try {
          const fileToUpload = e.dataTransfer.files[0];
          const fileName = fileToUpload.name;
          const uploadUrl = await bucketBrowser.currentDirectory?.getUploadUrl(
            fileName
          );
          if (!uploadUrl) {
            return;
          }
          const uploadResp = await fetch(uploadUrl, {
            method: 'PUT',
            body: fileToUpload
          });
          if (uploadResp.ok) {
            await showDialog({
              title: 'Upload Success!',
              body: `${fileName} was uploaded to ${bucketBrowser.currentDirectory?.absolutePath}/${fileName}`,
              buttons: [Dialog.okButton({ label: 'OK' })]
            });
            await finishAction();
          }
        } catch (e) {
          await showErrorMessage('Upload Failed', e);
        }
      }
    }
    setUploading(false);
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
        display: show ? 'block' : 'none'
      }}
    >
      {uploading ? (
        <>
          <p className={'bucket-text-info'}>Uploading files...</p>
          <UploadAnimation />
        </>
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
