import React from 'react';
import { useApp, useHasPerm } from '../../state/AppContext';
import { getCust } from '../../state/selectors';
import { MeStampBlock } from '../../components/StampWidget';
import { StatusBadge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { KpiCard } from '../../components/ui/KpiCard';
import { fmtDate, fmtTime, isoDate, mondayOf } from '../../utils/date';

export function MeTimePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canCorrection = hasPerm('time_correction_request');
  const mine = [...state.timeEntries].filter((t) => t.employeeId === state.currentUserId).sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const todayIso = isoDate(new Date());
  const todayMinutes = state.timeEntries
    .filter((t) => t.employeeId === state.currentUserId && isoDate(new Date(t.clockIn)) === todayIso)
    .reduce((s, t) => {
      const end = t.clockOut ? new Date(t.clockOut) : new Date();
      return s + ((end.getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0));
    }, 0);
  const weekStart = mondayOf(new Date());
  const weekMinutes = state.timeEntries
    .filter((t) => t.employeeId === state.currentUserId && t.clockOut && new Date(t.clockIn) >= weekStart)
    .reduce((s, t) => s + ((new Date(t.clockOut as string).getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0)), 0);

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <MeStampBlock />
      </div>
      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <KpiCard icon="clock" label="Heute" value={`${(todayMinutes / 60).toFixed(1)} h`} bg="var(--primary-tint)" fg="var(--primary-dark)" />
        <KpiCard icon="hourglass" label="Diese Woche" value={`${(weekMinutes / 60).toFixed(1)} h`} bg="var(--amber-tint)" fg="#93670A" />
      </div>
      <div className="card">
        <div className="card-head">
          <h3>Meine Zeiteinträge</h3>
          <span className="hint">{mine.length} Einträge</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mine.length ? (
            mine.map((t) => {
              const c = getCust(state, t.customerId);
              const inD = new Date(t.clockIn);
              const outD = t.clockOut ? new Date(t.clockOut) : null;
              const dur = outD ? (outD.getTime() - inD.getTime()) / 60000 - (t.pauseMinutes || 0) : null;
              return (
                <div key={t.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 12.8 }}>{fmtDate(inD)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="hint" style={{ marginTop: 5 }}>
                    <span className="mono">
                      {fmtTime(inD)}–{outD ? fmtTime(outD) : 'läuft…'}
                    </span>{' '}
                    · {c ? c.name : '–'}
                  </div>
                  <div className="hint">
                    {t.pauseMinutes ? `${t.pauseMinutes} Min. Pause` : 'Keine Pause'}
                    {dur !== null ? ` · ${Math.round(dur)} Min. gesamt` : ''}
                  </div>
                  {canCorrection ? (
                    <button className="link-btn" style={{ marginTop: 6 }} onClick={() => actions.openModal('meCorrection', { entryId: t.id })}>
                      Korrektur beantragen
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <Empty icon="clock" text="Noch keine Zeiteinträge vorhanden." />
          )}
        </div>
      </div>
    </>
  );
}
