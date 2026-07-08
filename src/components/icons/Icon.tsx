import React from 'react';

export type IconName =
  | 'dashboard'
  | 'schedule'
  | 'employees'
  | 'clock'
  | 'absence'
  | 'location'
  | 'settings'
  | 'plus'
  | 'search'
  | 'edit'
  | 'trash'
  | 'close'
  | 'check'
  | 'pin'
  | 'chevL'
  | 'chevR'
  | 'users2'
  | 'briefcase'
  | 'hourglass'
  | 'menu'
  | 'bolt'
  | 'droplet';

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  schedule: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </>
  ),
  employees: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17.5" cy="8.5" r="2.6" />
      <path d="M15 14.3c2.8.3 5 2.4 5 5.7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  absence: (
    <>
      <path d="M20 7l-8.5 8.5L7 11" />
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s7-6.7 7-12a7 7 0 10-14 0c0 5.3 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.8 7.8 0 000-3l2-1.5-2-3.4-2.4.8a7.8 7.8 0 00-2.6-1.5L14 2h-4l-.4 2.4a7.8 7.8 0 00-2.6 1.5l-2.4-.8-2 3.4L4.6 10a7.8 7.8 0 000 3l-2 1.6 2 3.4 2.4-.8c.75.66 1.63 1.16 2.6 1.5L10 22h4l.4-2.4a7.8 7.8 0 002.6-1.5l2.4.8 2-3.4-2-1.6z" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <line x1="21" y1="21" x2="16.2" y2="16.2" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  pin: (
    <>
      <path d="M12 21s7-6.7 7-12a7 7 0 10-14 0c0 5.3 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.6" />
    </>
  ),
  chevL: <polyline points="15 18 9 12 15 6" />,
  chevR: <polyline points="9 18 15 12 9 6" />,
  users2: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="2.5" y1="12.5" x2="21.5" y2="12.5" />
    </>
  ),
  hourglass: <path d="M6 2h12M6 22h12M8 2c0 4.5 8 5.5 8 10s-8 5.5-8 10M16 2c0 4.5-8 5.5-8 10s8 5.5 8 10" />,
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
  bolt: <polygon points="13 2 3 14 11 14 10 22 21 10 13 10 13 2" />,
  droplet: <path d="M12 2.5s6.5 7.6 6.5 12.1a6.5 6.5 0 11-13 0C5.5 10.1 12 2.5 12 2.5z" />,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const isFilled = name === 'droplet';
  return (
    <span className={className} style={{ display: 'inline-flex' }}>
      <svg
        viewBox="0 0 24 24"
        fill={isFilled ? 'currentColor' : 'none'}
        stroke={isFilled ? 'none' : 'currentColor'}
        strokeWidth={name === 'plus' ? 2.4 : name === 'check' ? 2.4 : name === 'close' ? 2.2 : name === 'chevL' || name === 'chevR' ? 2.3 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </svg>
    </span>
  );
}
