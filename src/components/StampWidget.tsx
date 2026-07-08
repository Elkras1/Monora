import React from 'react';
import { Icon } from './icons/Icon';
import { useApp, useActingEmployeeId, useHasPerm } from '../state/AppContext';
import { getCust, getEmp, openEntryFor } from '../state/selectors';
import { useClock } from '../hooks/useClock';
import { fmtTime, pad } from '../utils/date';

/** Admin/Manager Stempeluhr – zeigt den gewählten Mitarbeiter und erlaubt manuelles Ein-/Ausstempeln. */
export function StampWidget({ compact }: { compact?: boolean }) {
  const { state, actions } = useApp();
  const now = useClock();
  const emp = getEmp(state, state.currentEmployeeId);
  const open = emp ? openEntryFor(state, emp.id) : undefined;
  const isOn = !!open;

  return (
    <div className="stamp-widget">
      <div className="dial-wrap">
        {isOn ? (
          <>
            <div className="dial-pulse" />
            <div className="dial-pulse d2" />
            <div className="dial-pulse d3" />
          </>
        ) : null}
        <div className="dial-ring" />
        <div className={`dial-core ${isOn ? '' : 'off'}`}>
          <div className="time mono">
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
          </div>
          <div className="lbl">{isOn ? 'Eingestempelt' : 'Bereit'}</div>
        </div>
      </div>
      <div className="stamp-info">
        <div className="who">Angemeldet als</div>
        <h2>{emp ? emp.name : 'Kein Mitarbeiter'}</h2>
        {!compact ? (
          <div className="field" style={{ maxWidth: 260 }}>
            <select value={state.currentEmployeeId ?? ''} onChange={(e) => actions.setCurrentEmployeeId(e.target.value)}>
              {state.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="stamp-meta">
          <div>
            Status
            <b>{isOn ? 'Im Einsatz' : 'Nicht eingestempelt'}</b>
          </div>
          {isOn && open ? (
            <>
              <div>
                Seit
                <b>{fmtTime(new Date(open.clockIn))}</b>
              </div>
              <div>
                Standort
                <b>{getCust(state, open.customerId)?.name || '–'}</b>
              </div>
            </>
          ) : null}
        </div>
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
    </div>
  );
}

/** Mitarbeiter-Stempelblock (Self-Service) – inkl. Pausenlogik. */
export function MeStampBlock() {
  const { state, actions } = useApp();
  const now = useClock();
  const actingId = useActingEmployeeId();
  const hasPerm = useHasPerm();
  const open = openEntryFor(state, actingId);
  const isOn = !!open;
  const onPause = isOn && !!open?.pauseStart;
  const canClock = hasPerm('time_clock');

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
          style={onPause ? { background: 'linear-gradient(160deg,#DB9B0C,#93670A)' } : undefined}
        >
          <div className="time mono">
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
          </div>
          <div className="lbl">{onPause ? 'Pause' : isOn ? 'Eingestempelt' : 'Bereit'}</div>
        </div>
      </div>
      <div className="stamp-info">
        <div className="stamp-meta">
          <div>
            Status
            <b>{onPause ? 'In Pause' : isOn ? 'Im Einsatz' : 'Nicht eingestempelt'}</b>
          </div>
          {isOn && open ? (
            <>
              <div>
                Seit
                <b>{fmtTime(new Date(open.clockIn))}</b>
              </div>
              <div>
                Standort
                <b>{getCust(state, open.customerId)?.name || '–'}</b>
              </div>
            </>
          ) : null}
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!canClock ? (
            <span className="hint">Keine Berechtigung zur Zeiterfassung.</span>
          ) : !isOn ? (
            <button className="btn btn-accent" onClick={() => actions.openModal('clockin')}>
              <Icon name="pin" /> Arbeitszeit starten
            </button>
          ) : onPause ? (
            <button className="btn btn-accent" onClick={() => actingId && actions.endPause(actingId)}>
              <Icon name="check" /> Pause beenden
            </button>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => actingId && actions.startPause(actingId)}>
                Pause starten
              </button>
              <button className="btn btn-danger" onClick={() => actions.openModal('clockout')}>
                <Icon name="close" /> Arbeitszeit beenden
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
