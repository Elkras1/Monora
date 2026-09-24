import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { fmtDate, fmtTime, isoDate } from '../utils/date';
import type { TimeEntry } from '../types';

/** Höchstzahl direkt sichtbarer Mitarbeiter — darüber hinaus öffnet "+N weitere" die bestehende Live-Liste. */
const MAX_VISIBLE = 8;

/** Aktuelle Dauer ohne Pausenzeiten, z. B. "2h 14min" / "14min" — pro Minute neu berechnet. */
function workedLabel(entry: TimeEntry, nowMs: number): string {
  const pauseOngoingMs = entry.pauseStart ? nowMs - new Date(entry.pauseStart).getTime() : 0;
  const ms = Math.max(0, nowMs - new Date(entry.clockIn).getTime() - entry.pauseMinutes * 60000 - pauseOngoingMs);
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/**
 * Dashboard-Bereiche "Aktuell im Einsatz" und "In Pause" (Admin/Manager) — zwei Varianten derselben
 * Komponente, die auf dem Desktop exakt nebeneinander (50/50) stehen (siehe .dash-module-pair-row und
 * ModuleGroup in DashboardPage.tsx): Zahl rechts im Kartenkopf, darunter kompakte Live-Zeilen (Punkt · Name ·
 * Objekt · Zeit). Zeigt nur tatsächlich eingestempelte bzw. pausierende Mitarbeiter (offene Zeiteinträge).
 * Ein Klick öffnet das bestehende Live-Status-Detail (onOpen), Datenlogik wird nicht verändert.
 */
export function DashboardActiveNow({
  entries,
  variant = 'active',
  onOpen,
  onShowAll,
}: {
  entries: TimeEntry[];
  variant?: 'active' | 'pause';
  onOpen: (entry: TimeEntry) => void;
  onShowAll: () => void;
}) {
  const { state } = useApp();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isPauseCard = variant === 'pause';

  // Nur einmal pro halbe Minute aktualisieren — die Dauer wird in Minuten angezeigt, ein Sekundentakt
  // würde das gesamte Dashboard unnötig oft neu rendern.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const todayIso = isoDate(new Date(nowMs));
  const sortKey = (t: TimeEntry) => new Date(isPauseCard && t.pauseStart ? t.pauseStart : t.clockIn).getTime();
  const sorted = [...entries].sort((a, b) => sortKey(a) - sortKey(b));
  const visible = sorted.slice(0, MAX_VISIBLE);
  const hidden = sorted.length - visible.length;

  return (
    <>
      <div className="card-head">
        <h3>{isPauseCard ? 'In Pause' : 'Aktuell im Einsatz'}</h3>
        <span className="dash-live-count">{entries.length}</span>
      </div>
      {entries.length ? (
        <>
          <div className={`dash-live-list ${visible.length <= 3 ? "is-single" : ""}`}>
            {visible.map((t) => {
              const emp = getEmp(state, t.employeeId);
              const cust = getCust(state, t.customerId);
              const onPause = !!t.pauseStart;
              const objectName = cust ? cust.name : 'Kein Objekt';
              let meta: string;
              if (isPauseCard && t.pauseStart) {
                meta = `${objectName} · Pause seit ${fmtTime(new Date(t.pauseStart))}`;
              } else {
                const clockIn = new Date(t.clockIn);
                const since = isoDate(clockIn) === todayIso ? fmtTime(clockIn) : `${fmtDate(clockIn).slice(0, 6)} ${fmtTime(clockIn)}`;
                meta = `${objectName} · seit ${since} · ${workedLabel(t, nowMs)}${onPause ? ' · Pause' : ''}`;
              }
              return (
                <div key={t.id} className="dash-live-row" onClick={() => onOpen(t)} title="Details öffnen">
                  <span className={`dash-live-dot ${onPause ? 'is-pause' : 'is-live'}`} />
                  <div className="dash-live-text">
                    <div className="dash-live-name">{emp ? emp.name : 'Unbekannt'}</div>
                    <div className="dash-live-meta">{meta}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {hidden > 0 ? (
            <button className="dash-live-more" onClick={onShowAll}>
              +{hidden} weitere anzeigen
            </button>
          ) : null}
        </>
      ) : (
        <div className="dash-live-empty">{isPauseCard ? 'Aktuell ist niemand in Pause.' : 'Aktuell ist niemand eingestempelt.'}</div>
      )}
    </>
  );
}
