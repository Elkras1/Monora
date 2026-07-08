import React from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { KpiCard } from '../components/ui/KpiCard';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { colorFor, initials } from '../utils/format';
import { addDays, mondayOf } from '../utils/date';

export function ReportsPage() {
  const { state, actions, toast } = useApp();
  const hasPerm = useHasPerm();
  const canExport = hasPerm('reports_export');
  const canDetail = hasPerm('reports_time_view');
  const period = state.filter.reportPeriod ?? 'week';

  const now = new Date();
  const rangeStart = period === 'week' ? mondayOf(now) : new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = period === 'week' ? addDays(rangeStart, 7) : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rows = state.employees
    .filter((e) => e.status === 'aktiv')
    .map((e) => {
      const entries = state.timeEntries.filter((t) => t.employeeId === e.id && t.clockOut && new Date(t.clockIn) >= rangeStart && new Date(t.clockIn) < rangeEnd);
      const totalMin = entries.reduce((s, t) => s + ((new Date(t.clockOut as string).getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0)), 0);
      const shifts = state.shifts.filter((s) => s.employeeId === e.id && new Date(s.date) >= rangeStart && new Date(s.date) < rangeEnd).length;
      return { e, hours: totalMin / 60, entries: entries.length, shifts };
    })
    .sort((a, b) => b.hours - a.hours);
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);

  const exportReport = () => {
    const csvRows = state.employees.map((e) => {
      const entries = state.timeEntries.filter((t) => t.employeeId === e.id && t.clockOut && new Date(t.clockIn) >= rangeStart && new Date(t.clockIn) < rangeEnd);
      const totalMin = entries.reduce((s, t) => s + ((new Date(t.clockOut as string).getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0)), 0);
      return [e.name, e.role, entries.length, (totalMin / 60).toFixed(2)];
    });
    const csv = ['Mitarbeiter;Rolle;Einträge;Stunden', ...csvRows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arbeitszeitbericht-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Bericht exportiert.');
  };

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${period === 'week' ? 'active' : ''}`} onClick={() => actions.setFilter({ reportPeriod: 'week' })}>
            Diese Woche
          </button>
          <button className={`tab ${period === 'month' ? 'active' : ''}`} onClick={() => actions.setFilter({ reportPeriod: 'month' })}>
            Dieser Monat
          </button>
        </div>
        {canExport ? (
          <button className="btn btn-outline" onClick={exportReport}>
            <Icon name="check" /> Als CSV exportieren
          </button>
        ) : null}
      </div>
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <KpiCard icon="hourglass" label="Gesamtstunden" value={`${totalHours.toFixed(1)} h`} bg="var(--amber-tint)" fg="#93670A" delta={period === 'week' ? 'diese Woche' : 'dieser Monat'} />
        <KpiCard icon="users2" label="Aktive Mitarbeiter" value={rows.length} bg="var(--primary-tint)" fg="var(--primary-dark)" delta="im Zeitraum" />
        <KpiCard icon="schedule" label="Geplante Schichten" value={rows.reduce((s, r) => s + r.shifts, 0)} bg="#E3F3FE" fg="var(--accent-dark)" delta="im Zeitraum" />
        <KpiCard icon="clock" label="Ø Stunden / Mitarbeiter" value={rows.length ? `${(totalHours / rows.length).toFixed(1)} h` : '0 h'} bg="var(--red-tint)" fg="var(--red)" delta="Durchschnitt" />
      </div>
      {canDetail ? (
        <div className="card">
          <div className="card-head">
            <h3>Arbeitszeiten nach Mitarbeiter</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mitarbeiter</th>
                  <th>Rolle</th>
                  <th>Einträge</th>
                  <th>Schichten</th>
                  <th>Stunden</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr key={r.e.id}>
                      <td>
                        <div className="person">
                          <div className="avatar" style={{ background: colorFor(r.e.id) }}>
                            {initials(r.e.name)}
                          </div>
                          <span>{r.e.name}</span>
                        </div>
                      </td>
                      <td>{r.e.role}</td>
                      <td>{r.entries}</td>
                      <td>{r.shifts}</td>
                      <td className="mono">{r.hours.toFixed(1)} h</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <Empty icon="briefcase" text="Keine Daten im gewählten Zeitraum." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Empty icon="briefcase" text="Detaillierte Arbeitszeitberichte sind für deine Rolle nicht freigegeben." />
      )}
    </>
  );
}
