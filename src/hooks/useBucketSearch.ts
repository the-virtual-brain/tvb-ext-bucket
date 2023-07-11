import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';

export const useBucketSearch = (): IBucketSearch => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [availableBuckets, setAvailableBuckets] = useState<Array<string>>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const [chosenValue, setChosenValue] = useState<string>('');
  const [searchMatchingValues, setSearchMatchingValues] = useState<
    Array<string>
  >([]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      requestAPI<Array<string>>('buckets_list')
        .then(res => {
          setAvailableBuckets(res);
          setSearchMatchingValues(res);
          setLoading(false);
        })
        .catch(error => {
          setError(error);
        });
    }

    return () => {
      // cleanup in case component is unmounted when request is done
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const filteredValues = availableBuckets.filter(bucketName =>
      bucketName.includes(searchValue)
    );
    setSearchMatchingValues(filteredValues);
  }, [searchValue]);

  useEffect(() => {
    setSearchValue(chosenValue);
  }, [chosenValue]);

  return {
    loading,
    searchValue,
    setSearchValue,
    searchMatchingValues,
    error,
    chosenValue,
    setChosenValue
  };
};

export interface IBucketSearch {
  loading: boolean;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  searchMatchingValues: Array<string>;
  error: any;
  chosenValue: string;
  setChosenValue: React.Dispatch<React.SetStateAction<string>>;
}
