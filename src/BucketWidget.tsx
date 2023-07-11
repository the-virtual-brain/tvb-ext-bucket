import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { ReactWidget, showErrorMessage } from '@jupyterlab/apputils';
import { BucketFileBrowser } from './bucketFileBrowser';
import { CollabSpaceEntry } from './CollabSpaceEntry';
import { folderIcon } from '@jupyterlab/ui-components';
import { JpSpinner } from './JpSpinner';
import { DropZone } from './DropZone';
import {
  AutoCompleteOptions,
  BucketContextProvider,
  useBucketContext
} from './BucketContext';
import { BucketSearch } from './BucketSearch';
import { useBucketSearch } from './hooks/useBucketSearch';
import { Settings } from './Settings';
import { guessBucket } from './utils/bucketUtils';
import { useOuterClickClosable } from './hooks/useOuterClickClosable';

export const BucketSpace = (): JSX.Element => {
  const [currentDir, setCurrentDir] =
    useState<BucketFileBrowser.BucketDirectory | null>(null);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    fileBrowser: bucketBrowser,
    lastBucket,
    setLastBucket,
    autocompleteOption
  } = useBucketContext();

  const data = useBucketSearch();
  const { searchValue, setSearchValue, setChosenValue } = data;

  const inputContainerRef = useRef<HTMLSpanElement>(null);
  const { isComponentVisible, setIsComponentVisible, ref } =
    useOuterClickClosable<HTMLDivElement>(false, {
      refToIgnore: inputContainerRef
    });

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
      setLastBucket(bucketBrowser.bucket);
    }),
    [bucketBrowser]
  );

  const navigateHome = useCallback(
    withSpinnerDecorator(async () => {
      if (!bucketBrowser.currentDirectory) {
        return;
      }
      const home = await bucketBrowser.cd();
      setCurrentDir(home);
    }),
    [bucketBrowser]
  );

  useEffect(() => {
    bucketBrowser.bucket = searchValue;
  }, [searchValue, bucketBrowser]);

  // if on mount we have a bucket name saved, open that bucket
  useEffect(() => {
    if (autocompleteOption === AutoCompleteOptions.Guess) {
      guessBucket()
        .then(guessedBucket => setChosenValue(guessedBucket))
        .catch(err => {
          showErrorMessage('ERROR', err).then(() => {
            console.warn('Did not estimate a bucket!');
            setChosenValue('');
          });
        });
    } else if (
      autocompleteOption === AutoCompleteOptions.None ||
      autocompleteOption === null
    ) {
      setChosenValue('');
    } else {
      setChosenValue(lastBucket ?? '');
    }
  }, []);

  return (
    <>
      <div>
        <div className={'bucket-logo'}>
          <span className={'collab-logo'} />
          <span className={'bucket-logo-text'}>Bucket</span>
          <Settings />
        </div>
        <span ref={inputContainerRef}>
          <input
            type={'text'}
            value={searchValue}
            aria-label={'bucket-name-input'}
            placeholder={'bucket-name'}
            onChange={ev => setSearchValue(ev.target.value)}
            onFocus={_ev => setIsComponentVisible(true)} // on focus show available buckets list
          />
        </span>

        <button onClick={getBucket}>Connect!</button>
        <BucketSearch
          data={data}
          showList={isComponentVisible}
          setShowList={setIsComponentVisible}
          ref={ref}
        />
      </div>

      <div className={'bucket-BreadCrumbs'}>
        <span onClick={navigateHome}>
          <folderIcon.react tag="span" className={'bucket-home'} />
        </span>
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
              {index === 0 && '/'}
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
