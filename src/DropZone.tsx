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
import { requestAPI } from './handler';
import INativeUploadResponse = DropZone.INativeUploadResponse;
import { UploadAnimation } from './FileTransferAnimations';

const source: { drag: null | Drag } = { drag: null };

export const DropZone: React.FC<DropZone.IProps> = ({
  show,
  finishAction
}: DropZone.IProps) => {
  const [mode, setMode] = useState<'default' | 'hover'>('default');
  const [uploading, setUploading] = useState<boolean>(false);

  // to be used in memoized values or callbacks if we don't
  // need them to change definition when 'uploading' state is changed
  const uploadingRef = useRef<boolean>(uploading);
  // keep uploadingRef in sync with uploading state
  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

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
    source.drag = new Drag({
      mimeData: new MimeData(),
      source: initiator,
      proposedAction: 'copy'
    });
    source.drag.mimeData.setData('text/plain', JSON.stringify(dragSource));
    source.drag
      .start(ev.clientX, ev.clientY)
      .then(() => console.log('drag ended'));
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
          let toDir = '';
          if (bucketBrowser.currentDirectory) {
            toDir = bucketBrowser.currentDirectory.absolutePath;
          }
          const fileToUpload = e.dataTransfer.files[0];
          const fileName = fileToUpload.name;
          const bucket = bucketBrowser.bucket;
          const uploadUrlResp = await requestAPI<INativeUploadResponse>(
            `local_upload?to_bucket=${encodeURIComponent(
              bucket
            )}&to_path=${encodeURIComponent(toDir)}&with_name=${fileName}`
          );
          const uploadResp = await fetch(uploadUrlResp.url, {
            method: 'PUT',
            body: fileToUpload
          });
          if (uploadResp.ok) {
            await showDialog({
              title: 'Upload Success!',
              body: `${fileName} was successfully uploaded to ${toDir}!`,
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

  export interface INativeUploadResponse {
    success: boolean;
    url: string;
  }
}

export interface IDragInitiator {
  source: any;
  action: AsyncCallable | Callable | undefined;
}

export type AsyncCallable = () => Promise<any>;
export type Callable = () => any;
