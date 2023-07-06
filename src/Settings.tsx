import React from 'react';
import { AutoCompleteOptions, useBucketContext } from './BucketContext';
import { settingsIcon } from '@jupyterlab/ui-components';
import { useOuterClickClosable } from './hooks/useOuterClickClosable';

export const Settings: React.FC = () => {
  const { autocompleteOption, setAutocompleteOption } = useBucketContext();
  const { ref, isComponentVisible, setIsComponentVisible } =
    useOuterClickClosable<HTMLSpanElement>(false);

  const toggleSettings = (_ev: React.MouseEvent): void => {
    setIsComponentVisible(prev => !prev);
  };

  return (
    <span className={'bucket-Settings-container'} ref={ref}>
      <span onClick={toggleSettings} className={'bucket-Settings-toggle'}>
        <settingsIcon.react />
      </span>
      <div
        className={'bucket-Settings'}
        style={{ display: isComponentVisible ? 'block' : 'none' }}
      >
        <h4>Settings</h4>
        <hr />
        <div
          className={'bucket-Preferences-container'}
          onChange={(e: React.FormEvent) => {
            setAutocompleteOption(
              (e.target as HTMLInputElement).value as AutoCompleteOptions
            );
          }}
        >
          <p
            title={
              'After setting an option refresh the page for the setting to have effect!'
            }
          >
            Auto-complete:
          </p>
          <div>
            <input
              type={'radio'}
              name={'bucket-preferences'}
              id={'no-preference'}
              value={AutoCompleteOptions.None}
              defaultChecked={
                autocompleteOption === AutoCompleteOptions.None ||
                autocompleteOption === null
              }
            />
            <label
              htmlFor={'no-preference'}
              title={
                'On opening bucket extension, bucket name will not be completed automatically'
              }
            >
              No auto-complete
            </label>
          </div>
          <div>
            <input
              type={'radio'}
              name={'bucket-preferences'}
              id={'save-last'}
              value={AutoCompleteOptions.LastAccessed}
              defaultChecked={
                autocompleteOption === AutoCompleteOptions.LastAccessed
              }
            />
            <label
              htmlFor={'save-last'}
              title={
                'On opening the bucket extension, bucket name will be autocompleted with the name of the last accessed bucket.'
              }
            >
              Last accessed bucket
            </label>
          </div>
          <div>
            <input
              type={'radio'}
              name={'bucket-preferences'}
              id={'guess'}
              value={AutoCompleteOptions.Guess}
              defaultChecked={autocompleteOption === AutoCompleteOptions.Guess}
            />
            <label
              htmlFor={'guess'}
              title={
                'On opening bucket extension, will try to autocomplete bucket name by guessing the bucket from collab.'
              }
            >
              Estimated bucket
            </label>
          </div>
        </div>
      </div>
    </span>
  );
};
