import React, { createContext, useContext, useMemo } from 'react';
import { BucketFileBrowser } from './bucketFileBrowser';
import { ContextError } from './exceptions';
import { useStoredState } from './hooks/useStoredState';

const BucketContext = createContext<IContext | undefined>(undefined);

export const BucketContextProvider: React.FC = ({ children }) => {
  const [lastBucket, setLastBucket] = useStoredState<string>(
    '',
    'last-accessed-bucket'
  );
  const [autocompleteOption, setAutocompleteOption] =
    useStoredState<AutoCompleteOptions>(
      AutoCompleteOptions.None,
      'autocomplete-option'
    );

  // no need to re-instantiate browser ever again after component is mounted
  const bucketBrowser = useMemo(
    () => new BucketFileBrowser({ bucketEndPoint: 'buckets', bucket: '' }),
    []
  );

  const context = {
    fileBrowser: bucketBrowser,
    lastBucket,
    setLastBucket,
    autocompleteOption,
    setAutocompleteOption
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
  lastBucket: string;
  setLastBucket: React.Dispatch<React.SetStateAction<string>>;
  autocompleteOption: AutoCompleteOptions;
  setAutocompleteOption: React.Dispatch<
    React.SetStateAction<AutoCompleteOptions>
  >;
}

export enum AutoCompleteOptions {
  None = 'no-preference',
  LastAccessed = 'save-last',
  Guess = 'guess'
}
