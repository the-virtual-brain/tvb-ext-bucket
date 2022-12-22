import React from 'react';
import { LabIcon } from '@jupyterlab/ui-components';

export const ContextMenuItem: React.FC<ContextMenuItem.IProps> = ({
  label,
  action,
  icon
}): JSX.Element => {
  return (
    <li onClick={action} className={'bucket-ContextMenu-item'}>
      {icon && <icon.react />}
      <p>{label}</p>
    </li>
  );
};

export namespace ContextMenuItem {
  export interface IProps {
    label: string;
    action: () => void;
    icon?: LabIcon;
  }
}
