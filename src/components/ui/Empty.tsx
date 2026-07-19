import React from 'react';
import { Icon, IconName } from '../icons/Icon';

export function Empty({ icon, text, children }: { icon: IconName; text: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <p>{text}</p>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}
