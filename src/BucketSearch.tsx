import React from 'react';
import { IBucketSearch } from './hooks/useBucketSearch';

export const BucketSearch: React.FC<BucketSearch.IProps> = ({
  data,
  showList
}) => {
  return (
    <div>
      {data.error && <p style={{ color: 'red' }}>{data.error}</p>}
      {data.loading ? (
        <span className={'jp-Spinner'} />
      ) : (
        <>
          <span className={'error'}>{(data.error as Error).toString()}</span>
          <ul
            className={'available-buckets'}
            style={{ visibility: showList ? 'visible' : 'hidden' }}
          >
            {data.searchMatchingValues.map(val => {
              return (
                <li
                  onClick={_ev => {
                    data.setChosenValue(val);
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
};

export namespace BucketSearch {
  export interface IProps {
    data: IBucketSearch;
    showList: boolean;
  }
}
