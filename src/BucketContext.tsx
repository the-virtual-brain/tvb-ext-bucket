import React, { createContext, useState, useContext } from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';

const BucketContext = createContext<BucketContext.IContext | undefined>(
  undefined
);

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
export const useBucketContext = () => {
  const ctx = useContext(BucketContext);
  if (ctx === undefined) {
    throw new Error(
      'useBucketContext must be used within a BucketContextProvider'
    );
  }

  return ctx;
};

export namespace BucketContext {
  export interface IContext {
    fileBrowser: BucketFileBrowser;
    bucketName: string;
    setBucketName: React.Dispatch<React.SetStateAction<string>>;
  }
}
