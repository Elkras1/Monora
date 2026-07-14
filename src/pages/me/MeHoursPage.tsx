import React from 'react';
import { useApp } from '../../state/AppContext';
import { getCust } from '../../state/selectors';
import { Empty } from '../../components/ui/Empty';
import { KpiCard } from '../../components/ui/KpiCard';
import { fmtDate, fmtTime, mondayOf } from '../../utils/date';

const FILTER_TABS = [
  { id: 'week', label: 'Diese Woche' },
  { id: 'month', label: 'Dieser Monat' },
  { id: 'all', label: 'Alle' },
] as const;

function fmtHoursMin(totalMinutes: number): string {
  const total = Math.round(totalMinutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h} h ${m} min`;
}

/**
 * „Meine Stunden“: reine Anzeige der eigenen gespeicherten Arbeitszeiten.
 * Nur lesend – kein Bearbeiten, Bestätigen oder Löschen für Mitarbeiter.
 * Bewusst ohne Status (offen/bestätigt/korrigiert) — das ist Sache von Admin/Manager, Mitarbeiter
 * sehen hier nur Datum, Objekt, Zeit und Gesamtzeit.
 */
export function MeHoursPage() {
  const { state, actions } = useApp();
  const filter = state.filter.hoursFilter ?? 'week';

  const mine = [...state.timeEntries]
    .filter((t) => t.employeeId === state.currentUserId)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const now = new Date();
  const weekStart = mondayOf(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const hoursSince = (start: Date) =>
    mine
      .filter((t) => t.clockOut && new Date(t.clockIn) >= start)
      .reduce(
        (s, t) => s + ((new Date(t.clockOut as string).getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0)),
        0
      ) / 60;

  const weekHours = hoursSince(weekStart);
  const monthHours = hoursSince(monthStart);

  const filtered = mine.filter((t) => {
    if (filter === 'week') return new Date(t.clockIn) >= weekStart;
    if (filter === 'month') return new Date(t.clockIn) >= monthStart;
    return true;
  });

  return (
    <>
      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <KpiCard icon="hourglass" label="Diese Woche" value={`${weekHours.toFixed(1)} h`} bg="var(--amber-tint)" fg="#93670A" />
        <KpiCard
          icon="hourglass"
          label="Dieser Monat"
          value={`${monthHours.toFixed(1)} h`}
          bg="var(--primary-tint)"
          fg="var(--primary-dark)"
        />
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {FILTER_TABS.map((f) => (
          <button
            key={f.id}
            className={`tab ${filter === f.id ? 'active' : ''}`}
            onClick={() => actions.setFilter({ hoursFilter: f.id })}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length ? (
          filtered.map((t) => {
            const c = getCust(state, t.customerId);
            const inD = new Date(t.clockIn);
            const outD = t.clockOut ? new Date(t.clockOut) : null;
            const dur = outD ? (outD.getTime() - inD.getTime()) / 60000 - (t.pauseMinutes || 0) : null;
            return (
              <div key={t.id} className="card me-hours-row">
                <div className="me-hours-row-date">{fmtDate(inD)}</div>
                <div className="me-hours-row-cust">{c ? c.name : '–'}</div>
                <div className="me-hours-row-foot">
                  <span className="mono">
                    {fmtTime(inD)} – {outD ? fmtTime(outD) : 'läuft…'}
                  </span>
                  <span className="me-hours-row-total">{dur !== null ? fmtHoursMin(dur) : '–'}</span>
                </div>
              </div>
            );
          })
        ) : (
          <Empty icon="hourglass" text="Keine Zeiteinträge in diesem Zeitraum." />
        )}
      </div>
    </>
  );
}
