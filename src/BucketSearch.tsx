import React from 'react';
import { IBucketSearch } from './hooks';

export const BucketSearch: React.FC<BucketSearch.IProps> = ({
  data,
  showList
}) => {
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
            style={{ display: 'none' }}
          >
            {data.searchMatchingValues.map(val => {
              return (
                <option value={val} key={val}>
                  {val}
                </option>
              );
            })}
          </select>
          <ul
            className={'available-buckets'}
            style={{ visibility: showList ? 'visible' : 'hidden' }}
          >
            {data.searchMatchingValues.map(val => {
              return (
                <li
                  onClick={ev => {
                    console.log('click on bucket');
                    // todo: does not trigger, needs fixing
                    ev.preventDefault();
                    ev.stopPropagation();
                    data.setChosenValue(val);
                  }}
                  key={val}
                  onFocus={() => console.log('focus bucket')}
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
