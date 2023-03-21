import { useEffect, useState, useMemo, Dispatch, SetStateAction } from 'react';

export function useStoredState<T>(
  initialValue: T,
  storeLabel: string
): [T, Dispatch<SetStateAction<T>>, string] {
  const accessKey = useMemo<string>(() => `tvb-ext-bucket:${storeLabel}`, []);
  const [state, setState] = useState<T>(
    JSON.parse(localStorage.getItem(accessKey) as string)
  );

  useEffect(() => {
    const valueToStore = JSON.stringify(state);
    localStorage.setItem(accessKey, valueToStore);
  }, [state]);

  return [state, setState, accessKey];
}
