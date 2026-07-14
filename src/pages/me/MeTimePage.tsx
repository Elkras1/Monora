import React, { useEffect, useRef, useState } from 'react';
import { useApp, useActingEmployeeId, useHasPerm } from '../../state/AppContext';
import { eligibleCustomersFor, getCust, getEmp, openEntryFor } from '../../state/selectors';
import { useClock } from '../../hooks/useClock';
import { useGeolocation } from '../../hooks/useGeolocation';
import { haversine } from '../../utils/geo';
import { formatDurationClock, isoDate } from '../../utils/date';
import { Icon } from '../../components/icons/Icon';

type CheckError = { kind: 'out-of-range'; distance: number; radius: number } | { kind: 'no-location' };

/**
 * Mitarbeiter-Zeiterfassung: moderne, runde Stempeluhr-Karte (Objekt, Status, laufende Zeit,
 * Start/Pause/Stopp) — kein Verlauf, keine Statistiken, keine Abwesenheiten.
 *
 * START/STOPP öffnen bewusst KEIN Modal mehr: die Geofencing-Prüfung (GPS abrufen, Distanz zum
 * Objekt berechnen, Radius prüfen) läuft im Hintergrund über denselben `useGeolocation`-Hook, den
 * zuvor ClockInModal/ClockOutModal genutzt haben, und mündet direkt in dieselben zentralen Aktionen
 * (`confirmClockIn`/`confirmClockOut`) — die eigentliche Zeit-/Geofencing-Logik bleibt unverändert,
 * nur der Dialog davor entfällt. ClockInModal/ClockOutModal bleiben als Dateien bestehen, da sie
 * weiterhin vom Admin/Manager-„Live-Status"-Stempelwidget (StampWidget) genutzt werden.
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

  const { status, fix, locate } = useGeolocation();
  const [pendingAction, setPendingAction] = useState<'start' | 'stop' | null>(null);
  const [checkingCustomerId, setCheckingCustomerId] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<CheckError | null>(null);

  // Nach einem abgeschlossenen Stopp (isOn wechselt von true auf false) die Objekt-Auswahl zurücksetzen,
  // damit für die nächste Schicht bewusst neu ausgewählt werden muss.
  const wasOnRef = useRef(isOn);
  useEffect(() => {
    if (wasOnRef.current && !isOn) {
      setSelectedCustomerId('');
      setCheckError(null);
    }
    wasOnRef.current = isOn;
  }, [isOn]);

  // Reagiert auf das Ergebnis der Hintergrund-Standortprüfung, sobald `useGeolocation` von
  // "locating" auf "success"/"error" wechselt — startet/stoppt bei Erfolg sofort, ohne Dialog.
  useEffect(() => {
    if (!pendingAction || (status !== 'success' && status !== 'error')) return;

    if (pendingAction === 'start') {
      const cust = checkingCustomerId ? getCust(state, checkingCustomerId) : undefined;
      if (cust && emp) {
        const geofenceOff = !cust.geofenceEnabled;
        const distance = status === 'success' && fix ? haversine(fix.lat, fix.lng, cust.lat, cust.lng) : null;
        const withinRadius = geofenceOff || (distance !== null && distance <= cust.radius);
        const canConfirm = geofenceOff || (status === 'success' && withinRadius);
        if (canConfirm) {
          const effectiveFix = fix ?? { lat: 0, lng: 0, accuracy: 0 };
          const todayIso = isoDate(new Date());
          const assignedShift = state.shifts.find((s) => s.employeeId === emp.id && s.customerId === cust.id && s.date === todayIso);
          actions.confirmClockIn(emp.id, cust.id, effectiveFix, distance ?? 0, cust.radius, withinRadius, assignedShift?.serviceId ?? null);
          setCheckError(null);
        } else if (status === 'success' && distance !== null) {
          setCheckError({ kind: 'out-of-range', distance, radius: cust.radius });
        } else {
          setCheckError({ kind: 'no-location' });
        }
      }
    } else if (actingId && open) {
      const cust = getCust(state, open.customerId);
      if (cust) {
        const geofenceOff = !cust.geofenceEnabled;
        const distance = status === 'success' && fix ? haversine(fix.lat, fix.lng, cust.lat, cust.lng) : null;
        const withinRadius = geofenceOff || (distance !== null && distance <= cust.radius);
        const canConfirm = geofenceOff || (status === 'success' && withinRadius);
        if (canConfirm) {
          const effectiveFix = fix ?? { lat: 0, lng: 0, accuracy: 0 };
          actions.confirmClockOut(actingId, effectiveFix, distance ?? 0, 'Arbeitszeit gespeichert.');
          setCheckError(null);
        } else if (status === 'success' && distance !== null) {
          setCheckError({ kind: 'out-of-range', distance, radius: cust.radius });
        } else {
          setCheckError({ kind: 'no-location' });
        }
      }
    }
    setPendingAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStart = () => {
    if (!selectedCustomerId || pendingAction) return;
    setCheckError(null);
    setCheckingCustomerId(selectedCustomerId);
    setPendingAction('start');
    locate();
  };

  const handleStop = () => {
    if (pendingAction) return;
    setCheckError(null);
    setPendingAction('stop');
    locate();
  };

  const togglePause = () => {
    if (!actingId || pendingAction) return;
    setCheckError(null);
    if (onPause) actions.endPause(actingId);
    else actions.startPause(actingId);
  };

  const errorBox = (retry: () => void) =>
    checkError ? (
      <div className="warn-box stampclock-check-error">
        <Icon name="close" /> {checkError.kind === 'out-of-range' ? 'Du bist zu weit vom Einsatzort entfernt.' : 'Standortzugriff erforderlich.'}
        {checkError.kind === 'out-of-range' ? (
          <div style={{ marginTop: 6, fontWeight: 600 }}>
            Entfernung: {Math.round(checkError.distance)} m
            <br />
            Erlaubter Radius: {checkError.radius} m
          </div>
        ) : null}
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={retry}>
            {checkError.kind === 'out-of-range' ? 'Erneut versuchen' : 'Standort erneut prüfen'}
          </button>
        </div>
      </div>
    ) : null;

  if (!canClock) {
    return (
      <div className="stampclock-page">
        <div style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Keine Berechtigung zur Zeiterfassung.</div>
      </div>
    );
  }

  if (!isOn) {
    return (
      <div className="stampclock-page">
        <div className="stampclock-idle-select-wrap">
          <select
            className={`stampclock-idle-select ${selectedCustomerId ? '' : 'is-empty'}`}
            value={selectedCustomerId}
            disabled={pendingAction === 'start'}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              setCheckError(null);
            }}
          >
            <option value="">Bitte Objekt auswählen</option>
            {pool.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="stampclock-round-btn is-start" onClick={handleStart} disabled={!selectedCustomerId || pendingAction === 'start'}>
          <Icon name="clock" />
          Start
        </button>
        {pendingAction === 'start' ? (
          <div className="stampclock-checking">
            <Icon name="location" /> Standort wird geprüft …
          </div>
        ) : null}
        {!pendingAction ? errorBox(handleStart) : null}
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
    <div className="stampclock-page">
      <div className="stampclock-card">
        <div className={`stampclock-icon-badge ${onPause ? 'is-pause' : 'is-live'}`}>
          <Icon name="clock" />
        </div>
        <div className={`stampclock-status ${onPause ? 'is-pause' : 'is-live'}`}>
          <span className="dot" />
          {onPause ? 'Pause' : 'Arbeitszeit läuft'}
        </div>
        <div className={`stampclock-timer ${onPause ? 'is-pause' : ''}`}>{formatDurationClock(onPause ? pauseMs : workedMs)}</div>
        {onPause ? (
          <div className="stampclock-sub-timer">
            Arbeitszeit bisher: <b>{formatDurationClock(workedMs)}</b>
          </div>
        ) : null}
        <div className="stampclock-object-label">Objekt</div>
        <div className="stampclock-object">{cust ? cust.name : '–'}</div>
        <div className="stampclock-btn-zone">
          {onPause ? (
            <button className="stampclock-round-btn is-resume" onClick={togglePause} disabled={pendingAction === 'stop'}>
              <Icon name="play" />
              Pause beenden
            </button>
          ) : (
            <button className="stampclock-round-btn is-pause" onClick={togglePause} disabled={pendingAction === 'stop'}>
              <Icon name="pause" />
              Pause
            </button>
          )}
          <button className="stampclock-round-btn is-stop" onClick={handleStop} disabled={pendingAction === 'stop'}>
            <Icon name="stop" />
            Stopp
          </button>
        </div>
        {pendingAction === 'stop' ? (
          <div className="stampclock-checking">
            <Icon name="location" /> Standort wird geprüft …
          </div>
        ) : null}
        {!pendingAction ? errorBox(handleStop) : null}
      </div>
    </div>
  );
}
