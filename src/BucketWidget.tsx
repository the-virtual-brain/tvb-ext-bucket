import React, { ReactElement, useState, useCallback } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { BucketFileBrowser } from './bucketFileBrowser';
import { CollabSpaceEntry } from './CollabSpaceEntry';

export const BucketSpace = (): JSX.Element => {
  const [files, setFiles] = useState<Array<BucketFileBrowser.IBucketEntry>>([]);
  const [bucketName, setBucketName] = useState<string>('');

  const bucketBrowser = new BucketFileBrowser({
    bucketEndPoint: 'buckets',
    bucket: bucketName
  });

  const getBucket = useCallback(() => {
    bucketBrowser.openBucket().then(files => setFiles(files));
  }, [bucketBrowser]);

  if (!files) {
    return <p>Waiting for buckets to be ready...</p>;
  }

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
      <ul>
        {files.map((bucketEntry): ReactElement => {
          return (
            <CollabSpaceEntry
              tag={'li'}
              metadata={bucketEntry}
              key={bucketEntry.name}
            />
          );
        })}
      </ul>
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
