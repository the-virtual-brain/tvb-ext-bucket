import React, { useCallback, useState } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';

export const ContextMenuItem: React.FC<ContextMenuItem.IProps> = ({
  label,
  action,
  icon
}): JSX.Element => {
  const [loading, setLoading] = useState<boolean>(false);
  const handleAction = useCallback(async () => {
    setLoading(true);
    await action();
    setLoading(false);
  }, []);

  return (
    <li onClick={handleAction} className={'bucket-ContextMenu-item'}>
      {icon && <icon.react />}
      <p>{label}</p>
      <span
        className={'bucket-Spinner'}
        style={{ display: loading ? 'inline-block' : 'none' }}
      ></span>
    </li>
  );
};

export namespace ContextMenuItem {
  export type AsyncFunc = () => Promise<void>;
  export type Func = () => void;

  export interface IProps {
    label: string;
    action: Func | AsyncFunc;
    icon?: LabIcon;
  }
}
