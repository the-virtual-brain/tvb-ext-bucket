import React, { createContext, useState, useContext, useEffect } from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { ContextError } from './exceptions';

const BucketContext = createContext<IContext | undefined>(undefined);

const BUCKET_KEY = 'tvb-ext-bucket:bucket-name';

export const BucketContextProvider: React.FC = ({ children }) => {
  const [bucketName, setBucketName] = useState<string>(
    localStorage.getItem(BUCKET_KEY) as string
  );

  useEffect(() => {
    if (bucketName === null || bucketName === '') {
      return;
    }
    localStorage.setItem(BUCKET_KEY, bucketName);
  }, [bucketName]);

  const context = {
    fileBrowser: new BucketFileBrowser({
      bucketEndPoint: 'buckets',
      bucket: bucketName
    }),
    bucketName: bucketName,
    setBucketName: setBucketName
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
  bucketName: string;
  setBucketName: React.Dispatch<React.SetStateAction<string>>;
}
