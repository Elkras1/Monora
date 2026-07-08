import React from 'react';
import { Icon } from '../icons/Icon';
import { useApp } from '../../state/AppContext';

export function ToastHost() {
  const { toasts } = useApp();
  if (!toasts.length) return null;
  return (
    <>
      {toasts.map((t, i) => (
        <div className="toast" key={t.id} style={{ bottom: 20 + i * 54 }}>
          <Icon name="check" />
          <span>{t.message}</span>
        </div>
      ))}
    </>
  );
}
