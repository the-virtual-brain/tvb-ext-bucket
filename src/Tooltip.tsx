import React, { useState } from 'react';

export const useToolTip = ({
  hasLoader,
  displayInfo
}: IOptions): [
  React.FC,
  React.Dispatch<React.SetStateAction<string>>,
  React.Dispatch<React.SetStateAction<boolean>>
] => {
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>(
    displayInfo ? displayInfo : ''
  );

  const style: React.CSSProperties = {
    display: visible ? 'flex' : 'none'
  };

  const ToolTip: React.FC = (): JSX.Element => (
    <div style={style} className={'bucket-Tooltip'}>
      {hasLoader && <span className={'bucket-Spinner'} />}
      <p>{message}</p>
    </div>
  );

  return [ToolTip, setMessage, setVisible];
};

export interface IOptions {
  hasLoader: boolean;
  displayInfo?: string;
}
