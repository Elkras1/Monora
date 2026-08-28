import React from 'react';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';
import { getCust, getEmp, openEntryFor } from '../state/selectors';
import { fmtTime } from '../utils/date';

/** Admin/Manager Stempeluhr – zeigt den gewählten Mitarbeiter und erlaubt manuelles Ein-/Ausstempeln.
 * Bewusst ohne tickende Live-Uhr/Sekundenanzeige — Admin/Manager brauchen hier nur Status und Aktion,
 * keine dekorative Zeitanzeige (siehe .stampclock-* in MeTimePage.tsx für die Mitarbeiter-Stempeluhr,
 * die ihre laufende Zeit weiterhin anzeigt). */
export function StampWidget({ compact }: { compact?: boolean }) {
  const { state, actions } = useApp();
  const emp = getEmp(state, state.currentEmployeeId);
  const open = emp ? openEntryFor(state, emp.id) : undefined;
  const isOn = !!open;

  return (
    <div className="stamp-card">
      <div className="stamp-card-head">
        <div className={`stampclock-icon-badge ${isOn ? 'is-live' : ''}`}>
          <Icon name="clock" />
        </div>
        <div className="stamp-card-who">
          <div className="who">Angemeldet als</div>
          <h3>{emp ? emp.name : 'Kein Mitarbeiter'}</h3>
        </div>
        <span className={`badge ${isOn ? 'badge-green' : 'badge-grey'}`}>
          <span className="badge-dot" />
          {isOn ? 'Im Einsatz' : 'Nicht eingestempelt'}
        </span>
      </div>
      {!compact ? (
        <div className="field" style={{ maxWidth: 260, marginTop: 12 }}>
          <select value={state.currentEmployeeId ?? ''} onChange={(e) => actions.setCurrentEmployeeId(e.target.value)}>
            {state.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {isOn && open ? (
        <div className="stamp-meta">
          <div>
            Seit
            <b>{fmtTime(new Date(open.clockIn))}</b>
          </div>
          <div>
            Standort
            <b>{getCust(state, open.customerId)?.name || '–'}</b>
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        {isOn ? (
          <button className="btn btn-danger" onClick={() => actions.openModal('clockout')}>
            <Icon name="close" /> Ausstempeln
          </button>
        ) : (
          <button className="btn btn-accent" onClick={() => actions.openModal('clockin')}>
            <Icon name="pin" /> Einstempeln
          </button>
        )}
      </div>
    </div>
  );
}
