import React from 'react';
import { useApp, useCurrentUser, useHasPerm } from '../../state/AppContext';
import { openEntryFor } from '../../state/selectors';
import { MeStampBlock } from '../../components/StampWidget';
import { MeShiftRow } from '../../components/MeShiftRow';
import { AbsenceTypeBadge, StatusBadge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { KpiCard } from '../../components/ui/KpiCard';
import { colorFor, initials } from '../../utils/format';
import { fmtDate, isoDate, pad } from '../../utils/date';

export function MeStartPage() {
  const { state } = useApp();
  const user = useCurrentUser();
  const hasPerm = useHasPerm();
  if (!user) return null;

  const todayIso = isoDate(new Date());
  const mine = state.shifts.filter((s) => s.employeeId === state.currentUserId).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const todayShift = mine.find((s) => s.date === todayIso);
  const nowLabel = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  const nextShift = mine.find((s) => s.date > todayIso || (s.date === todayIso && s.start > nowLabel));

  const [weekStart] = weekBounds();
  const weekMinutes = state.timeEntries
    .filter((t) => t.employeeId === state.currentUserId && t.clockOut && new Date(t.clockIn) >= weekStart)
    .reduce((s, t) => s + ((new Date(t.clockOut as string).getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0)), 0);
  const weekH = weekMinutes / 60;
  const remaining = Math.max(0, (state.settings.weeklyHours || 40) - weekH);

  const todayMinutes = state.timeEntries
    .filter((t) => t.employeeId === state.currentUserId && isoDate(new Date(t.clockIn)) === todayIso)
    .reduce((s, t) => {
      const end = t.clockOut ? new Date(t.clockOut) : new Date();
      return s + ((end.getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0));
    }, 0);

  const open = openEntryFor(state, state.currentUserId);
  const openShiftsCount = hasPerm('schedule_open_view') ? state.shifts.filter((s) => !s.employeeId).length : 0;
  const myAbsences = [...state.absences].filter((a) => a.employeeId === state.currentUserId).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 2);

  return (
    <>
      <div className="me-greet">
        <div className="me-greet-txt">
          <div className="hint">{new Date().toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
          <h2>Hallo, {user.name.split(' ')[0]}</h2>
        </div>
        <div className="avatar" style={{ background: colorFor(user.id), width: 44, height: 44, fontSize: 16 }}>
          {initials(user.name)}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <h3>Zeiterfassung</h3>
        </div>
        <MeStampBlock />
      </div>

      <div className="grid cols-2" style={{ marginBottom: 14 }}>
        <KpiCard icon="hourglass" label="Diese Woche" value={`${weekH.toFixed(1)} h`} bg="var(--amber-tint)" fg="#93670A" delta={`${remaining.toFixed(1)} h verbleibend`} />
        <KpiCard icon="clock" label="Heute" value={`${(todayMinutes / 60).toFixed(1)} h`} bg="var(--primary-tint)" fg="var(--primary-dark)" delta={open ? 'läuft gerade' : 'noch nicht gestartet'} />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <h3>Heutige Schicht</h3>
        </div>
        {todayShift ? <MeShiftRow shift={todayShift} /> : <Empty icon="schedule" text="Heute ist keine Schicht für dich geplant." />}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <h3>Nächste Schicht</h3>
        </div>
        {nextShift ? <MeShiftRow shift={nextShift} /> : <Empty icon="schedule" text="Keine weiteren Schichten geplant." />}
      </div>
      {hasPerm('schedule_open_view') ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <h3>Offene Schichten</h3>
          </div>
          <div className="hint">
            {openShiftsCount
              ? `${openShiftsCount} offene Schicht${openShiftsCount > 1 ? 'en' : ''} verfügbar${hasPerm('schedule_open_claim') ? ' – jetzt übernehmen' : ''}.`
              : 'Aktuell keine offenen Schichten.'}
          </div>
        </div>
      ) : null}
      <div className="card">
        <div className="card-head">
          <h3>Meine Abwesenheitsanträge</h3>
        </div>
        {myAbsences.length ? (
          myAbsences.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.8 }}>
                  <AbsenceTypeBadge type={a.type} />
                </div>
                <div className="hint">
                  {fmtDate(new Date(a.start))} – {fmtDate(new Date(a.end))}
                </div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))
        ) : (
          <div className="hint">Keine Anträge vorhanden.</div>
        )}
      </div>
    </>
  );
}

function weekBounds(): [Date] {
  const x = new Date();
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return [x];
}
