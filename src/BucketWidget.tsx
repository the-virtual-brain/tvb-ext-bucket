import React, {
  ReactElement,
  useState,
  useCallback,
  useRef,
  useEffect
} from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { BucketFileBrowser } from './bucketFileBrowser';
import { CollabSpaceEntry } from './CollabSpaceEntry';
import { folderIcon } from '@jupyterlab/ui-components';
import { JpSpinner } from './JpSpinner';

export const BucketSpace = (): JSX.Element => {
  const [files, setFiles] = useState<Array<BucketFileBrowser.IBucketEntry>>([]);
  const [bucketName, setBucketName] = useState<string>('');
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const bucketBrowserRef = useRef<BucketFileBrowser>(
    new BucketFileBrowser({
      bucketEndPoint: 'buckets',
      bucket: bucketName
    })
  );

  /**
   * decorator for async functions to show a spinner instead of the dir structure while they resolve
   */
  const withSpinnerDecorator = useCallback((callback: () => Promise<any>) => {
    const decoratedFn = () => {
      setShowSpinner(true);
      callback().then(() => {
        setShowSpinner(false);
      });
    };
    return decoratedFn;
  }, []);

  const getBucket = useCallback(
    withSpinnerDecorator(async () => {
      const files = await bucketBrowserRef.current.openBucket(); //.then(files => setFiles(files));
      setFiles(files);
    }),
    [bucketBrowserRef]
  );

  useEffect(() => {
    bucketBrowserRef.current.bucket = bucketName;
  }, [bucketName]);

  return (
    <>
      <div>
        <div className={'collab-logo'} />
        <input
          type={'text'}
          value={bucketName}
          onChange={ev => setBucketName(ev.target.value)}
        />
        <button onClick={getBucket}>Connect!</button>
      </div>

      <div className={'bucket-BreadCrumbs'}>
        <folderIcon.react tag="span" className={'bucket-home'} />
        {bucketBrowserRef.current.currentDirectoryPath.map(dir => {
          return <span key={dir}>{dir}</span>;
        })}
      </div>

      {showSpinner ? (
        <JpSpinner />
      ) : (
        <ul>
          {files.map((bucketEntry): ReactElement => {
            return (
              <CollabSpaceEntry
                tag={'li'}
                metadata={bucketEntry}
                key={bucketEntry.name}
                onClick={withSpinnerDecorator(async () => {
                  const files = await bucketBrowserRef.current.cd(
                    bucketEntry.name
                  );
                  setFiles(files);
                })}
              />
            );
          })}
        </ul>
      )}
    </>
  );
};

export class BucketWidget extends ReactWidget {
  constructor() {
    super();
    this.addClass('tvb-bucketWidget');
  }

  protected render(): ReactElement | null {
    return (
      <div className={'bucket-container'}>
        <BucketSpace />
      </div>
    );
  }
}
