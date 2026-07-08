import React from 'react';
import { Icon, IconName } from '../icons/Icon';

export function Empty({ icon, text }: { icon: IconName; text: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <p>{text}</p>
    </div>
  );
}
