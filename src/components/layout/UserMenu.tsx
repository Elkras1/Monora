import React from 'react';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { roleLabel } from '../../data/permissions';

export function UserMenu() {
  const { state, actions } = useApp();
  const user = useCurrentUser();
  const role = useCurrentRole();
  if (!user) return null;
  const isStaff = role === 'mitarbeiter';

  const goTo = (view: 'me-profile' | 'me-absence') => {
    actions.setView(view);
    actions.setUserMenuOpen(false);
  };

  return (
    <div className="user-menu" onClick={(e) => e.stopPropagation()}>
      <div className="user-menu-head">Angemeldet als</div>
      <div className="user-menu-current">
        <Avatar id={user.id} name={user.name} photoUrl={user.photoUrl} size={32} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{user.name}</div>
          <div className="hint">
            {user.role} · automatisch erkannt: {roleLabel(role)}
          </div>
        </div>
      </div>
      {isStaff ? (
        <>
          <div className="divider" style={{ margin: '10px 0 8px' }} />
          <button className={`user-menu-item ${state.view === 'me-profile' ? 'active' : ''}`} onClick={() => goTo('me-profile')}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'var(--primary-tint)',
                color: 'var(--primary-dark)',
              }}
            >
              <Icon name="users2" />
            </span>
            <div style={{ fontWeight: 600, fontSize: 12.8 }}>Profil</div>
          </button>
          <button className={`user-menu-item ${state.view === 'me-absence' ? 'active' : ''}`} onClick={() => goTo('me-absence')}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'var(--primary-tint)',
                color: 'var(--primary-dark)',
              }}
            >
              <Icon name="absence" />
            </span>
            <div style={{ fontWeight: 600, fontSize: 12.8 }}>Abwesenheiten</div>
          </button>
        </>
      ) : (
        <div className="hint" style={{ padding: '10px 4px 4px' }}>
          Deine Rolle wird automatisch anhand deines Kontos erkannt und kann hier nicht verändert werden.
        </div>
      )}
      <div className="divider" style={{ margin: '10px 0 8px' }} />
      <button className="user-menu-item" onClick={() => actions.logout()}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 8,
            background: 'var(--red-tint)',
            color: 'var(--red)',
          }}
        >
          <Icon name="close" />
        </span>
        <div style={{ fontWeight: 600, fontSize: 12.8, color: 'var(--red)' }}>Abmelden</div>
      </button>
    </div>
  );
}
