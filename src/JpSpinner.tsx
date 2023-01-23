import React from 'react';

export const JpSpinner = (props: { show?: boolean }): JSX.Element => {
  if (props.show === false) {
    return <></>;
  }
  return <div className={'jp-SpinnerContent'} />;
};
