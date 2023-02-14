import React, { createContext, useState, useContext } from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { ContextError } from './exceptions';

const BucketContext = createContext<IContext | undefined>(undefined);

export const BucketContextProvider: React.FC = ({ children }) => {
  const [bucketName, setBucketName] = useState<string>('');
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
