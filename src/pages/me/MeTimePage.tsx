import React, { useEffect, useRef, useState } from 'react';
import { useApp, useActingEmployeeId, useHasPerm } from '../../state/AppContext';
import { eligibleCustomersFor, getCust, getEmp, openEntryFor } from '../../state/selectors';
import { useClock } from '../../hooks/useClock';
import { formatDurationMinSec } from '../../utils/date';

/**
 * Mitarbeiter-Zeiterfassung: zeigt ausschliesslich die Stempeluhr (kein Verlauf, keine Statistiken).
 * Geofencing-Prüfung läuft weiterhin über die bestehenden ClockInModal/ClockOutModal-Dialoge.
 */
export function MeTimePage() {
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

  // Nach einem abgeschlossenen Stopp (isOn wechselt von true auf false) die Objekt-Auswahl zurücksetzen,
  // damit für die nächste Schicht bewusst neu ausgewählt werden muss.
  const wasOnRef = useRef(isOn);
  useEffect(() => {
    if (wasOnRef.current && !isOn) {
      setSelectedCustomerId('');
    }
    wasOnRef.current = isOn;
  }, [isOn]);

  if (!canClock) {
    return (
      <div className="stamp-simple">
        <div className="hint">Keine Berechtigung zur Zeiterfassung.</div>
      </div>
    );
  }

  if (!isOn) {
    const startClockIn = () => {
      if (!selectedCustomerId) return;
      actions.openModal('clockin', { customerId: selectedCustomerId });
    };

    return (
      <div className="stamp-simple">
        <div className="field stamp-simple-field">
          <label>Objekt</label>
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
            <option value="">– Objekt wählen –</option>
            {pool.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!selectedCustomerId ? <div className="hint">Bitte Objekt auswählen</div> : null}
        </div>
        <button className="stamp-round-btn" onClick={startClockIn} disabled={!selectedCustomerId}>
          START
        </button>
      </div>
    );
  }

  const cust = getCust(state, open.customerId);
  const pauseStartMs = open.pauseStart ? new Date(open.pauseStart).getTime() : null;
  const nowMs = now.getTime();
  const clockInMs = new Date(open.clockIn).getTime();
  const workedMs = (onPause && pauseStartMs ? pauseStartMs : nowMs) - clockInMs - open.pauseMinutes * 60000;
  const pauseMs = onPause && pauseStartMs ? nowMs - pauseStartMs : 0;

  return (
    <div className="stamp-simple">
      <div className="stamp-simple-status">{onPause ? 'Pause läuft' : 'Arbeitszeit läuft'}</div>
      <div className="stamp-simple-object">{cust ? cust.name : '–'}</div>
      <div className="stamp-simple-timer">{formatDurationMinSec(workedMs)}</div>
      {onPause ? <div className="stamp-simple-pause-timer">Pause: {formatDurationMinSec(pauseMs)}</div> : null}
      <div className="stamp-simple-actions">
        {onPause ? (
          <button className="btn btn-accent btn-stamp" onClick={() => actingId && actions.endPause(actingId)}>
            Pause beenden
          </button>
        ) : (
          <button className="btn btn-outline btn-stamp" onClick={() => actingId && actions.startPause(actingId)}>
            Pause
          </button>
        )}
        <button
          className="btn btn-danger btn-stamp"
          onClick={() => actions.openModal('clockout', { successMessage: 'Arbeitszeit gespeichert.' })}
        >
          Stopp
        </button>
      </div>
    </div>
  );
}
