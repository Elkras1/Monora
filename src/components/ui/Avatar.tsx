import React from 'react';
import { colorFor, initials } from '../../utils/format';

/** Renders a profile photo if one is set, otherwise the existing colored-initials avatar. */
export function Avatar({
  id,
  name,
  photoUrl,
  size = 29,
  fontSize = 12,
  className,
  style,
}: {
  id: string;
  name: string;
  photoUrl?: string;
  size?: number;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (photoUrl) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: 9,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          flex: 'none',
          ...style,
        }}
      />
    );
  }
  return (
    <div className={`avatar ${className ?? ''}`} style={{ background: colorFor(id), width: size, height: size, fontSize, ...style }}>
      {initials(name)}
    </div>
  );
}
