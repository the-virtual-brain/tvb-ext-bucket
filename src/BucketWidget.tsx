import React, { ReactElement, useState, useCallback } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { jupyterIcon } from '@jupyterlab/ui-components';
import { BucketFileBrowser } from './bucketFileBrowser';

export const BucketSpace = (): JSX.Element => {
  const [files, setFiles] = useState<Set<BucketFileBrowser.IBucketEntry>>(
    new Set<BucketFileBrowser.IBucketEntry>()
  );
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
        {Array.from(files).map((bucketEntry, index): ReactElement => {
          return (
            <li key={index}>
              <jupyterIcon.react tag={'span'} />
              {bucketEntry.name}
            </li>
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
