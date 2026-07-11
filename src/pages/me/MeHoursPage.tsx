import React from 'react';
import { useApp } from '../../state/AppContext';
import { getCust } from '../../state/selectors';
import { StatusBadge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { KpiCard } from '../../components/ui/KpiCard';
import { fmtDate, fmtTime, mondayOf } from '../../utils/date';

const FILTER_TABS = [
  { id: 'week', label: 'Diese Woche' },
  { id: 'month', label: 'Dieser Monat' },
  { id: 'all', label: 'Alle' },
] as const;

/**
 * „Meine Stunden“: reine Anzeige der eigenen gespeicherten Arbeitszeiten.
 * Nur lesend – kein Bearbeiten, Bestätigen oder Löschen für Mitarbeiter.
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
  const openCount = mine.filter((t) => t.status === 'offen').length;
  const confirmedCount = mine.filter((t) => t.status === 'bestätigt').length;

  const filtered = mine.filter((t) => {
    if (filter === 'week') return new Date(t.clockIn) >= weekStart;
    if (filter === 'month') return new Date(t.clockIn) >= monthStart;
    return true;
  });

  return (
    <>
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <KpiCard icon="hourglass" label="Diese Woche" value={`${weekHours.toFixed(1)} h`} bg="var(--amber-tint)" fg="#93670A" />
        <KpiCard
          icon="hourglass"
          label="Dieser Monat"
          value={`${monthHours.toFixed(1)} h`}
          bg="var(--primary-tint)"
          fg="var(--primary-dark)"
        />
        <KpiCard icon="clock" label="Offen" value={openCount} bg="var(--surface-alt)" fg="var(--ink-soft)" />
        <KpiCard icon="check" label="Bestätigt" value={confirmedCount} bg="#E3F3FE" fg="var(--accent-dark)" />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length ? (
          filtered.map((t) => {
            const c = getCust(state, t.customerId);
            const inD = new Date(t.clockIn);
            const outD = t.clockOut ? new Date(t.clockOut) : null;
            const dur = outD ? (outD.getTime() - inD.getTime()) / 60000 - (t.pauseMinutes || 0) : null;
            return (
              <div key={t.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk'" }}>{fmtDate(inD)}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>{c ? c.name : '–'}</div>
                <div className="detail-grid">
                  <div>
                    <span className="dl">Startzeit</span>
                    <span className="dv mono">{fmtTime(inD)}</span>
                  </div>
                  <div>
                    <span className="dl">Endzeit</span>
                    <span className="dv mono">{outD ? fmtTime(outD) : 'läuft…'}</span>
                  </div>
                  <div>
                    <span className="dl">Pause</span>
                    <span className="dv">{t.pauseMinutes || 0} Min.</span>
                  </div>
                  <div>
                    <span className="dl">Gesamtzeit</span>
                    <span className="dv">{dur !== null ? `${Math.round(dur)} Min.` : '–'}</span>
                  </div>
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
