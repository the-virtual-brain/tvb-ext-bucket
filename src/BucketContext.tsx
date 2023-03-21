import React, { createContext, useContext } from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { ContextError } from './exceptions';
import { useStoredState } from './hooks/useStoredState';

const BucketContext = createContext<IContext | undefined>(undefined);

export const BucketContextProvider: React.FC = ({ children }) => {
  // const [bucketName, setBucketName] = useStoredState<string>('', 'bucket-name');
  const [shouldSaveLastBucket, setShouldSaveLastBucket] =
    useStoredState<boolean>(true, 'last-bucket');

  const context = {
    fileBrowser: new BucketFileBrowser({
      bucketEndPoint: 'buckets',
      bucket: ''
    }),
    shouldSaveLastBucket,
    setShouldSaveLastBucket
  };

  return (
    <BucketContext.Provider value={context}>{children}</BucketContext.Provider>
  );
};

/**
 * helper function to consume the context
 */
export const useBucketContext = (): IContext => {
  const ctx = useContext(BucketContext);
  if (ctx === undefined) {
    throw new ContextError(
      'useBucketContext must be used within a BucketContextProvider'
    );
  }

  return ctx;
};

export interface IContext {
  fileBrowser: BucketFileBrowser;
  shouldSaveLastBucket: boolean;
  setShouldSaveLastBucket: React.Dispatch<React.SetStateAction<boolean>>;
}
