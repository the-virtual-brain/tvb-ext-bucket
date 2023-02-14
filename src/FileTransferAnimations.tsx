import React from 'react';
import { fileUploadIcon } from '@jupyterlab/ui-components';

export const DownloadAnimation: React.FC = () => {
  return (
    <span className={'bucket-DownloadAnimation'}>
      <i className={'fa fa-arrow-down'} />
    </span>
  );
};

export const UploadAnimation: React.FC = () => {
  return (
    <span className={'bucket-UploadAnimation'}>
      <fileUploadIcon.react />
    </span>
  );
};
