import React, { useRef } from 'react';
import { useApp, useCurrentUser } from '../../state/AppContext';
import { Icon } from '../../components/icons/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { fileToResizedDataUrl } from '../../utils/image';

export function MeProfilePage() {
  const { state, actions, toast } = useApp();
  const user = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!user) return null;
  const customers = state.customers.filter((c) => user.customerIds.includes(c.id));

  const onPickPhoto = () => fileInputRef.current?.click();

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Bitte eine Bilddatei auswählen.');
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      actions.saveMyPhoto(dataUrl);
    } catch {
      toast('Bild konnte nicht geladen werden.');
    }
  };

  return (
    <>
      <div className="card" style={{ textAlign: 'center', padding: '28px 20px', marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 64, margin: '0 auto 12px' }}>
          <Avatar id={user.id} name={user.name} photoUrl={user.photoUrl} size={64} fontSize={22} />
        </div>
        <h2>{user.name}</h2>
        <div className="hint" style={{ marginBottom: 14 }}>{user.role}</div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoSelected} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={onPickPhoto}>
            <Icon name="edit" /> Profilbild ändern
          </button>
          {user.photoUrl ? (
            <button className="btn btn-ghost btn-sm" onClick={() => actions.saveMyPhoto(null)}>
              <Icon name="close" /> Entfernen
            </button>
          ) : null}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Angaben</h3>
          <button className="muted-link" onClick={() => actions.openModal('meProfile')}>
            <Icon name="edit" /> Bearbeiten
          </button>
        </div>
        <div className="detail-grid">
          <div>
            <span className="dl">E-Mail</span>
            <span className="dv">{user.email}</span>
          </div>
          <div>
            <span className="dl">Telefon</span>
            <span className="dv">{user.phone}</span>
          </div>
          <div>
            <span className="dl">Standort(e)</span>
            <span className="dv">{customers.length ? customers.map((x) => x.name).join(', ') : '–'}</span>
          </div>
          <div>
            <span className="dl">Rolle</span>
            <span className="dv">{user.role}</span>
          </div>
          <div>
            <span className="dl">Wochenstunden (Soll)</span>
            <span className="dv">{state.settings.weeklyHours} h</span>
          </div>
        </div>
      </div>
      <div className="hint">Nur vom Administrator freigegebene Felder können hier bearbeitet werden.</div>
    </>
  );
}
