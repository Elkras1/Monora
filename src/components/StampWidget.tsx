import React, { useState } from 'react';
import { Icon } from './icons/Icon';
import { useApp, useActingEmployeeId, useHasPerm } from '../state/AppContext';
import { eligibleCustomersFor, getCust, getEmp, openEntryFor } from '../state/selectors';
import { useClock } from '../hooks/useClock';
import { fmtTime, formatDurationClock, pad } from '../utils/date';

/** Admin/Manager Stempeluhr – zeigt den gewählten Mitarbeiter und erlaubt manuelles Ein-/Ausstempeln.
 * Bewusst ohne tickende Live-Uhr/Sekundenanzeige — Admin/Manager brauchen hier nur Status und Aktion,
 * keine dekorative Zeitanzeige (siehe .stampclock-* für die Mitarbeiter-Stempeluhr, die ihre laufende
 * Zeit weiterhin anzeigt). */
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

/** Mitarbeiter-Stempelblock (Self-Service) – einfache Stempeluhr mit Objekt-Auswahl und Pausenlogik. */
export function MeStampBlock() {
  const { state, actions } = useApp();
  const now = useClock();
  const actingId = useActingEmployeeId();
  const hasPerm = useHasPerm();
  const emp = getEmp(state, actingId);
  const open = openEntryFor(state, actingId);
  const isOn = !!open;
  const onPause = isOn && !!open?.pauseStart;
  const canClock = hasPerm('time_clock');

  const pool = eligibleCustomersFor(state, emp);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(pool[0]?.id ?? '');

  const clockInDate = open ? new Date(open.clockIn) : null;
  const workedMs = open
    ? now.getTime() -
      new Date(open.clockIn).getTime() -
      open.pauseMinutes * 60000 -
      (onPause && open.pauseStart ? now.getTime() - new Date(open.pauseStart).getTime() : 0)
    : 0;
  const dialTime = isOn ? formatDurationClock(workedMs) : `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const startClockIn = () => {
    if (!selectedCustomerId) return;
    actions.openModal('clockin', { customerId: selectedCustomerId });
  };

  return (
    <div className="stamp-widget">
      <div className="dial-wrap">
        {isOn && !onPause ? (
          <>
            <div className="dial-pulse" />
            <div className="dial-pulse d2" />
            <div className="dial-pulse d3" />
          </>
        ) : null}
        <div className="dial-ring" />
        <div
          className={`dial-core ${isOn && !onPause ? '' : 'off'}`}
          style={onPause ? { background: 'linear-gradient(160deg,var(--stamp-pause),var(--stamp-pause-dark))' } : undefined}
        >
          <div className="time mono">{dialTime}</div>
          <div className="lbl">{onPause ? 'Pause' : isOn ? 'Arbeitet' : 'Bereit'}</div>
        </div>
      </div>
      <div className="stamp-info">
        <div className="stamp-meta">
          <div>
            Status
            <b>{onPause ? 'Pause' : isOn ? 'Arbeitet' : 'Nicht eingestempelt'}</b>
          </div>
          {isOn && open && clockInDate ? (
            <>
              <div>
                Seit
                <b>{fmtTime(clockInDate)}</b>
              </div>
              <div>
                Objekt
                <b>{getCust(state, open.customerId)?.name || '–'}</b>
              </div>
            </>
          ) : null}
        </div>

        {!canClock ? (
          <div style={{ marginTop: 14 }}>
            <span className="hint">Keine Berechtigung zur Zeiterfassung.</span>
          </div>
        ) : !isOn ? (
          <div style={{ marginTop: 14 }}>
            <div className="field" style={{ maxWidth: 320 }}>
              <label>Reinigungsobjekt</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                <option value="">– Objekt wählen –</option>
                {pool.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {!selectedCustomerId ? <div className="hint" style={{ marginBottom: 10 }}>Bitte zuerst Objekt auswählen.</div> : null}
            <button className="btn btn-stamp btn-stamp-start" onClick={startClockIn} disabled={!selectedCustomerId}>
              <Icon name="play" /> Start
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onPause ? (
              <button className="btn btn-stamp btn-stamp-start" onClick={() => actingId && actions.endPause(actingId)}>
                <Icon name="check" /> Pause beenden
              </button>
            ) : (
              <>
                <button className="btn btn-stamp btn-stamp-pause" onClick={() => actingId && actions.startPause(actingId)}>
                  <Icon name="pause" /> Pause
                </button>
                <button className="btn btn-stamp btn-stamp-stop" onClick={() => actions.openModal('clockout')}>
                  <Icon name="stop" /> Stopp
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
