import React, { forwardRef } from 'react';
import { IBucketSearch } from './hooks/useBucketSearch';

export const BucketSearch = forwardRef<HTMLDivElement, BucketSearch.IProps>(
  ({ data, showList, setShowList }, ref) => {
    const { error, loading, searchMatchingValues, setChosenValue } = data;
    return (
      <div ref={ref}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {loading ? (
          <span className={'jp-Spinner'} />
        ) : (
          <>
            <span className={'error'}>{(error as Error).toString()}</span>
            <ul
              className={'available-buckets'}
              style={{ visibility: showList ? 'visible' : 'hidden' }}
            >
              {searchMatchingValues.map(val => {
                return (
                  <li
                    onClick={_ev => {
                      setChosenValue(val);
                      setShowList(false);
                    }}
                    key={val}
                  >
                    {val}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    );
  }
);

export namespace BucketSearch {
  export interface IProps {
    data: IBucketSearch;
    showList: boolean;
    setShowList: (show: boolean) => void;
  }
}
