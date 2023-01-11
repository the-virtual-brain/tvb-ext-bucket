import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { BucketFileBrowser } from './bucketFileBrowser';
import { CollabSpaceEntry } from './CollabSpaceEntry';
import { folderIcon } from '@jupyterlab/ui-components';
import { JpSpinner } from './JpSpinner';
import { BucketContextProvider, useBucketContext } from './BucketContext';

export const BucketSpace = (): JSX.Element => {
  const [currentDir, setCurrentDir] =
    useState<BucketFileBrowser.BucketDirectory | null>(null);
  const [bucketName, setBucketName] = useState<string>('');
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const bucketBrowser = useBucketContext().fileBrowser;

  /**
   * decorator for async functions to show a spinner instead of the dir structure while they resolve
   */
  const withSpinnerDecorator = useCallback((callback: () => Promise<any>) => {
    return () => {
      setShowSpinner(true);
      callback().then(() => {
        setShowSpinner(false);
      });
    };
  }, []);

  const getBucket = useCallback(
    withSpinnerDecorator(async () => {
      const bucketHomeDir = await bucketBrowser.openBucket();
      bucketHomeDir && setCurrentDir(bucketHomeDir);
    }),
    [bucketBrowser]
  );

  useEffect(() => {
    bucketBrowser.bucket = bucketName;
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
        {bucketBrowser.breadcrumbs.map((dir, index) => {
          return (
            <span
              key={index}
              className={'bucket-BreadCrumbs-Item'}
              onClick={withSpinnerDecorator(async () => {
                const currentDir = await bucketBrowser.goTo(
                  bucketBrowser.breadcrumbs[index].name
                );
                setCurrentDir(currentDir);
              })}
            >
              {dir.name}/
            </span>
          );
        })}
      </div>

      {showSpinner ? (
        <JpSpinner />
      ) : (
        <ul>
          {currentDir?.ls().map((bucketEntry): ReactElement => {
            let onClick = () => {
              return;
            };
            if (!bucketEntry.isFile) {
              onClick = withSpinnerDecorator(async () => {
                const currentDir = await bucketBrowser.cd(bucketEntry.name);
                setCurrentDir(currentDir);
              });
            }
            return (
              <CollabSpaceEntry
                tag={'li'}
                metadata={bucketEntry}
                key={bucketEntry.name}
                onClick={onClick}
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
        <BucketContextProvider>
          <BucketSpace />
        </BucketContextProvider>
      </div>
    );
  }
}
