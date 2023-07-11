import React, { useState, useEffect, useRef } from 'react';
import { assertIsNode } from '../utils/domUtils';

export interface IOuterClickClosable<T> {
  ref: React.RefObject<T>;
  isComponentVisible: boolean;
  setIsComponentVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface IOuterClickClosableOptions {
  /**
   * Ref of html element to be ignored by outer click (if you click children of this element, outer click is ignored)
   */
  refToIgnore?: React.RefObject<HTMLElement>;
}

/**
 * Hook to manipulate a boolean state (which is always set to false by default
 * or to the optional value provided by the optional valueSetOnOuterClick param)
 * if a click event is triggered by a click outside the element using the ref
 * provided by this hook.
 * @param initialIsVisible - initial value of the boolean state
 * @param options - options to apply
 * @param valueSetOnOuterClick - optional value to set on outer click
 */
export function useOuterClickClosable<T extends Element>(
  initialIsVisible: boolean,
  options?: IOuterClickClosableOptions,
  valueSetOnOuterClick?: boolean
): IOuterClickClosable<T> {
  const [isComponentVisible, setIsComponentVisible] =
    useState(initialIsVisible);

  const ref = useRef<T>(null);

  const handleClickOutside = (mouseEvent: MouseEvent): void => {
    const target: EventTarget | null = mouseEvent.target;
    assertIsNode(target);
    if (options?.refToIgnore?.current?.contains(target)) {
      return;
    }
    if (ref.current && !ref?.current?.contains(target)) {
      if (valueSetOnOuterClick !== undefined) {
        setIsComponentVisible(valueSetOnOuterClick);
      } else {
        setIsComponentVisible(false);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  return { ref, isComponentVisible, setIsComponentVisible };
}
