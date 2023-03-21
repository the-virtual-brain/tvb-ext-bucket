import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { BucketFileBrowser } from './bucketFileBrowser';
import { CollabSpaceEntry } from './CollabSpaceEntry';
import { folderIcon } from '@jupyterlab/ui-components';
import { JpSpinner } from './JpSpinner';
import { DropZone } from './DropZone';
import { BucketContextProvider, useBucketContext } from './BucketContext';
import { BucketSearch } from './BucketSearch';
import { useBucketSearch } from './hooks/useBucketSearch';

export const BucketSpace = (): JSX.Element => {
  const [currentDir, setCurrentDir] =
    useState<BucketFileBrowser.BucketDirectory | null>(null);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const [showList, setShowList] = useState<boolean>(false);

  const ctx = useBucketContext();
  const bucketBrowser = ctx.fileBrowser;
  const data = useBucketSearch();

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
    bucketBrowser.bucket = data.searchValue;
  }, [data.searchValue]);

  useEffect(() => {
    bucketBrowser.bucket = data.chosenValue;
  }, [data.chosenValue]);

  // if on mount we have a bucket name saved, open that bucket
  useEffect(() => {
    if (
      ctx.shouldSaveLastBucket &&
      data.chosenValue !== '' &&
      data.chosenValue !== null
    ) {
      getBucket();
    } else {
      data.setChosenValue('');
    }
  }, []);

  return (
    <>
      <div>
        <div className={'bucket-logo'}>
          <span className={'collab-logo'} />
          <span className={'bucket-logo-text'}>Bucket</span>
        </div>

        <input
          type={'text'}
          value={data.searchValue}
          aria-label={'bucket-name-input'}
          placeholder={'bucket-name'}
          onChange={ev => data.setSearchValue(ev.target.value)}
          onFocus={_ev => setShowList(true)}
          onBlur={_ev => setTimeout(() => setShowList(false), 500)}
        />
        <button onClick={getBucket}>Connect!</button>
        <BucketSearch data={data} showList={showList} />
        <div>
          <input
            type={'checkbox'}
            checked={ctx.shouldSaveLastBucket}
            name={'save-last-bucket'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              ctx.setShouldSaveLastBucket(e.target.checked)
            }
          />
          <label htmlFor={'save-last-bucket'}>Save last accessed bucket</label>
        </div>
      </div>

      <div className={'bucket-BreadCrumbs'}>
        <folderIcon.react tag="span" className={'bucket-home'} />
        {bucketBrowser.breadcrumbs.map((dir, index) => {
          return (
            <span
              key={index}
              className={'bucket-BreadCrumbs-Item'}
              aria-label={`breadcrumb-${index}`}
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

      <JpSpinner show={showSpinner} />
      <ul
        style={{
          display: showSpinner ? 'none' : 'block'
        }}
        className={'scrollableY'}
      >
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
              onContextFinish={getBucket}
            />
          );
        })}
      </ul>
      <DropZone
        show={!showSpinner && currentDir !== null}
        finishAction={getBucket}
      />
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
