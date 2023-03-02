import React from 'react';
import { IBucketSearch } from './hooks';

export const BucketSearch: React.FC<BucketSearch.IProps> = ({ data }) => {
  return (
    <div>
      {data.loading ? (
        <span className={'jp-Spinner'} />
      ) : (
        <>
          <span className={'error'}>{(data.error as Error).toString()}</span>

          <select
            name={'bucket'}
            id={'bucket'}
            autoFocus={true}
            value={data.chosenValue}
            onChange={ev => data.setChosenValue(ev.target.value)}
          >
            {data.searchMatchingValues.map(val => {
              return (
                <option value={val} key={val}>
                  {val}
                </option>
              );
            })}
          </select>
        </>
      )}
    </div>
  );
};

export namespace BucketSearch {
  export interface IProps {
    data: IBucketSearch;
  }
}
