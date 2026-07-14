import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useActingEmployeeId, useHasPerm } from '../../state/AppContext';
import { eligibleCustomersFor, getCust, getEmp, openEntryFor } from '../../state/selectors';
import { useClock } from '../../hooks/useClock';
import { useGeolocation } from '../../hooks/useGeolocation';
import { haversine, formatDistance } from '../../utils/geo';
import { formatDurationClock, isoDate } from '../../utils/date';
import { Icon } from '../../components/icons/Icon';
import type { Customer } from '../../types';

type CheckError = { kind: 'out-of-range'; distance: number; radius: number } | { kind: 'no-location' };
type NearbyCustomer = Customer & { distance: number };

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
 *
 * Objektauswahl: statt einer dauerhaft sichtbaren Dropdown-Liste sucht die Seite beim Öffnen (und
 * erneut nach jedem Stopp) automatisch per Geolocation nach erreichbaren Objekten aus dem für den
 * Mitarbeiter zulässigen Pool (`eligibleCustomersFor` — unverändert). Genau ein Treffer wird
 * automatisch übernommen, bei mehreren Treffern muss kurz ausgewählt werden, ohne Treffer bzw. ohne
 * Standortfreigabe wird START blockiert.
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

  const { status, fix, locate } = useGeolocation();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [pendingAction, setPendingAction] = useState<'start' | 'stop' | null>(null);
  const [checkingCustomerId, setCheckingCustomerId] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<CheckError | null>(null);

  // Beim Öffnen der (noch nicht laufenden) Zeiterfassung sofort im Hintergrund den Standort prüfen,
  // um passende Objekte in der Nähe zu finden.
  useEffect(() => {
    if (!isOn && canClock) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearby: NearbyCustomer[] = useMemo(() => {
    if (!fix) return [];
    return pool
      .map((c) => ({ ...c, distance: haversine(fix.lat, fix.lng, c.lat, c.lng) }))
      .filter((c) => !c.geofenceEnabled || c.distance <= c.radius)
      .sort((a, b) => a.distance - b.distance);
  }, [fix, pool]);

  // Genau ein Treffer: automatisch übernehmen, ohne dass der Mitarbeiter etwas auswählen muss.
  useEffect(() => {
    if (nearby.length === 1 && !selectedCustomerId) setSelectedCustomerId(nearby[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby]);

  // Nach einem abgeschlossenen Stopp (isOn wechselt von true auf false) die Objekt-Auswahl zurücksetzen
  // und den Standort neu prüfen, damit für die nächste Schicht wieder frisch erkannt wird.
  const wasOnRef = useRef(isOn);
  useEffect(() => {
    if (wasOnRef.current && !isOn) {
      setSelectedCustomerId('');
      setCheckError(null);
      locate();
    }
    wasOnRef.current = isOn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const selected = nearby.find((c) => c.id === selectedCustomerId) ?? pool.find((c) => c.id === selectedCustomerId);
    const showPicker = nearby.length > 1 && !selectedCustomerId;
    const locating = status === 'idle' || status === 'locating';

    return (
      <div className="stampclock-page is-idle">
        <div className="stampclock-object-zone">
          {locating && !nearby.length ? (
            <div className="stampclock-checking">
              <Icon name="location" /> Standort wird geprüft …
            </div>
          ) : status === 'error' ? (
            <div className="stampclock-locate-block">
              <Icon name="close" />
              <div>Standortzugriff erforderlich.</div>
              <button className="btn btn-outline btn-sm" onClick={() => locate()}>
                Standort erneut prüfen
              </button>
            </div>
          ) : status === 'success' && nearby.length === 0 ? (
            <div className="stampclock-locate-block">
              <Icon name="location" />
              <div>Kein Einsatzort in deiner Nähe gefunden.</div>
              <button className="btn btn-outline btn-sm" onClick={() => locate()}>
                Standort erneut prüfen
              </button>
            </div>
          ) : showPicker ? (
            <div className="stampclock-picker">
              <div className="stampclock-picker-title">Objekt wählen</div>
              <div className="stampclock-picker-list">
                {nearby.map((c) => (
                  <button key={c.id} className="stampclock-picker-item" onClick={() => setSelectedCustomerId(c.id)}>
                    <div className="stampclock-picker-item-main">
                      <div className="n">{c.name}</div>
                      <div className="a">{c.address}</div>
                    </div>
                    <div className="stampclock-picker-item-dist">{formatDistance(c.distance)}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : selected ? (
            <div className="stampclock-selected-object">
              <div className="name">{selected.name}</div>
              {nearby.length > 1 ? (
                <button className="stampclock-change-object" onClick={() => setSelectedCustomerId('')}>
                  Objekt ändern
                </button>
              ) : null}
            </div>
          ) : null}
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
