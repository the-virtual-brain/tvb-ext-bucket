import React, { ReactElement, useState } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { requestAPI } from './handler';

export namespace types {
  export interface IBucketResponse {
    message: string;
    files: Array<string>;
  }
}

export const BucketSpace = (): JSX.Element => {
  const [files, setFiles] = useState<Array<string>>([]);
  const [bucketName, setBucketName] = useState<string>('');

  const getBucket = () => {
    requestAPI<types.IBucketResponse>(`buckets?bucket=${bucketName}`)
      .then(response => {
        setFiles(response.files);
        console.log(response.message);
      })
      .catch(err => {
        console.log('Got Error! : ', err);
      });
  };

  if (!files) {
    return <p>Waiting for buckets to be ready...</p>;
  }

  return (
    <>
      <div>
        <input
          type={'text'}
          value={bucketName}
          onChange={ev => setBucketName(ev.target.value)}
        />
        <button onClick={getBucket}>Connect!</button>
      </div>
      <ul>
        {files.map((bucketName, index): ReactElement => {
          return <li key={index}>{bucketName}</li>;
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
