import React, { useMemo } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp, getService } from '../state/selectors';
import { KpiCard } from './ui/KpiCard';
import { StatusBadge } from './ui/Badge';
import { Empty } from './ui/Empty';
import { Icon } from './icons/Icon';
import { colorFor, initials } from '../utils/format';
import { fmtDate, isoDate, mondayOf } from '../utils/date';
import { buildExportRows, downloadFile, printRowsAsPdf, rowsToCsv } from '../utils/export';
import type { TimeEntry } from '../types';

const GROUP_OPTIONS = [
  { id: 'none', label: 'Keine Gruppierung' },
  { id: 'employee', label: 'Mitarbeiter' },
  { id: 'service', label: 'Leistung' },
  { id: 'customer', label: 'Standort' },
  { id: 'day', label: 'Tag' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
] as const;

/** Nur abgeschlossene Einträge tragen zu Dauer-Summen bei – noch laufende Einträge haben keine feste Dauer und bleiben bei 0 (sie erscheinen aber in der Liste). Einzige Quelle für alle Dauer-Berechnungen (Zeilen, Kennzahlen, Total), damit nirgends doppelt oder abweichend gerechnet wird. */
function durationMinutes(t: TimeEntry): number {
  if (!t.clockOut) return 0;
  return (new Date(t.clockOut).getTime() - new Date(t.clockIn).getTime()) / 60000 - (t.pauseMinutes || 0);
}
function durationHours(t: TimeEntry): number {
  return durationMinutes(t) / 60;
}
/** Formatiert Minuten als "8 h 30 min" (bzw. nur "8 h" ohne Rest) – wird erst hier, am Ende, gerundet. */
function fmtHM(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
function fmtTimeRange(inD: Date, outD: Date | null): string {
  const start = `${inD.getHours().toString().padStart(2, '0')}:${inD.getMinutes().toString().padStart(2, '0')}`;
  const end = outD ? `${outD.getHours().toString().padStart(2, '0')}:${outD.getMinutes().toString().padStart(2, '0')}` : 'läuft…';
  return `${start} – ${end}`;
}

export function TimeEvaluation() {
  const { state, actions, toast } = useApp();
  const hasPerm = useHasPerm();
  const f = state.filter;
  const canExport = hasPerm('time_export');

  const now = new Date();
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const dateFrom = f.evalDateFrom || monthStart;
  const dateTo = f.evalDateTo || monthEnd;
  const groupBy = f.evalGroupBy ?? 'none';

  const entries = useMemo(() => {
    return state.timeEntries
      .filter((t) => {
        const day = isoDate(new Date(t.clockIn));
        if (day < dateFrom || day > dateTo) return false;
        if (f.evalEmp && f.evalEmp !== 'alle' && t.employeeId !== f.evalEmp) return false;
        if (f.evalService && f.evalService !== 'alle') {
          if (f.evalService === 'keine') {
            if (t.serviceId) return false;
          } else if (t.serviceId !== f.evalService) {
            return false;
          }
        }
        if (f.evalCust && f.evalCust !== 'alle' && t.customerId !== f.evalCust) return false;
        if (f.evalStatus && f.evalStatus !== 'alle' && t.status !== f.evalStatus) return false;
        return true;
      })
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  }, [state.timeEntries, dateFrom, dateTo, f.evalEmp, f.evalService, f.evalCust, f.evalStatus]);

  const totalHours = entries.reduce((s, t) => s + durationHours(t), 0);
  const confirmedHours = entries.filter((t) => t.status === 'bestätigt').reduce((s, t) => s + durationHours(t), 0);
  const openHours = entries.filter((t) => t.status === 'offen').reduce((s, t) => s + durationHours(t), 0);
  const correctedHours = entries.filter((t) => t.status === 'korrigiert').reduce((s, t) => s + durationHours(t), 0);
  const totalPauseMin = entries.reduce((s, t) => s + (t.pauseMinutes || 0), 0);
  // Totalzeile am Tabellenende: exakt dieselben gefilterten Einträge und dieselbe Dauer-Funktion wie
  // oben und pro Zeile – nur einmal am Ende gerundet, damit sich keine Minuten-Rundungsfehler aufsummieren.
  const totalMinutesAll = entries.reduce((s, t) => s + durationMinutes(t), 0);

  function groupLabelFor(t: TimeEntry): string {
    switch (groupBy) {
      case 'employee':
        return getEmp(state, t.employeeId)?.name ?? '–';
      case 'service':
        return getService(state, t.serviceId)?.name ?? 'Keine Leistung zugewiesen';
      case 'customer':
        return getCust(state, t.customerId)?.name ?? '–';
      case 'day':
        return fmtDate(new Date(t.clockIn));
      case 'week':
        return `KW ab ${fmtDate(mondayOf(new Date(t.clockIn)))}`;
      case 'month':
        return new Date(t.clockIn).toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
      default:
        return '';
    }
  }

  const groups = useMemo(() => {
    if (groupBy === 'none') return [];
    const map = new Map<string, { label: string; hours: number; count: number }>();
    entries.forEach((t) => {
      const label = groupLabelFor(t);
      const cur = map.get(label) ?? { label, hours: 0, count: 0 };
      cur.hours += durationHours(t);
      cur.count += 1;
      map.set(label, cur);
    });
    return [...map.values()].sort((a, b) => b.hours - a.hours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, groupBy]);

  const exportFileBase = ['auswertung', dateFrom, dateTo].join('_');

  const exportCsv = () => {
    if (!entries.length) {
      toast('Keine Einträge für diese Filter zum Exportieren.');
      return;
    }
    const rows = buildExportRows(state, entries);
    downloadFile(`${exportFileBase}.csv`, rowsToCsv(rows), 'text/csv;charset=utf-8;');
    toast(`${entries.length} Zeiteinträge als CSV exportiert.`);
  };

  const exportPdf = () => {
    if (!entries.length) {
      toast('Keine Einträge für diese Filter zum Exportieren.');
      return;
    }
    const rows = buildExportRows(state, entries);
    const ok = printRowsAsPdf(rows, 'Auswertung Zeiterfassung');
    if (!ok) {
      toast('Popup wurde blockiert. Bitte Popups für diese Seite erlauben.');
      return;
    }
    toast('PDF-Druckansicht geöffnet – im Druckdialog „Als PDF speichern“ wählen.');
  };

  return (
    <>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={f.evalEmp ?? 'alle'} onChange={(e) => actions.setFilter({ evalEmp: e.target.value })}>
            <option value="alle">Alle Mitarbeiter</option>
            {state.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select value={f.evalService ?? 'alle'} onChange={(e) => actions.setFilter({ evalService: e.target.value })}>
            <option value="alle">Alle Leistungen</option>
            <option value="keine">Keine Leistung</option>
            {state.services.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.name}
                {!sv.active ? ' (inaktiv)' : ''}
              </option>
            ))}
          </select>
          <select value={f.evalCust ?? 'alle'} onChange={(e) => actions.setFilter({ evalCust: e.target.value })}>
            <option value="alle">Alle Standorte</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="filter-date-group">
            <span className="filter-date-label">Zeitraum</span>
            <input type="date" value={dateFrom} onChange={(e) => actions.setFilter({ evalDateFrom: e.target.value })} aria-label="Datum von" />
            <span className="filter-date-sep">–</span>
            <input type="date" value={dateTo} onChange={(e) => actions.setFilter({ evalDateTo: e.target.value })} aria-label="Datum bis" />
          </div>
          <select value={f.evalStatus ?? 'alle'} onChange={(e) => actions.setFilter({ evalStatus: e.target.value })}>
            <option value="alle">Alle Status</option>
            <option value="offen">Offen</option>
            <option value="bestätigt">Bestätigt</option>
            <option value="korrigiert">Korrigiert</option>
          </select>
        </div>
        {canExport ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={exportCsv}>
              <Icon name="download" /> CSV exportieren
            </button>
            <button className="btn btn-outline" onClick={exportPdf}>
              <Icon name="fileText" /> PDF exportieren
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <KpiCard icon="hourglass" label="Gesamtstunden" value={`${totalHours.toFixed(2)} h`} bg="var(--surface-alt)" fg="var(--ink-soft)" />
        <KpiCard icon="check" label="Bestätigte Stunden" value={`${confirmedHours.toFixed(2)} h`} bg="var(--primary-tint)" fg="var(--primary-dark)" />
        <KpiCard icon="clock" label="Offene Stunden" value={`${openHours.toFixed(2)} h`} bg="var(--amber-tint)" fg="#93670A" />
        <KpiCard icon="edit" label="Korrigierte Stunden" value={`${correctedHours.toFixed(2)} h`} bg="#E3EDF7" fg="#2A6FA8" />
        <KpiCard icon="fileText" label="Zeiteinträge" value={entries.length} bg="var(--surface-alt)" fg="var(--ink-soft)" />
        <KpiCard icon="pause" label="Gesamtpausenzeit" value={`${Math.round(totalPauseMin)} min`} bg="var(--surface-alt)" fg="var(--ink-soft)" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Gruppierung</h3>
          <select value={groupBy} onChange={(e) => actions.setFilter({ evalGroupBy: e.target.value as typeof groupBy })}>
            {GROUP_OPTIONS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        {groupBy === 'none' ? (
          <div className="hint">Wähle eine Gruppierung, um Summen z. B. je Leistung oder Mitarbeiter zu sehen.</div>
        ) : groups.length ? (
          groups.map((g) => (
            <div
              key={g.label}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}
            >
              <span style={{ fontWeight: 600, fontSize: 12.8 }}>{g.label}</span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {g.hours.toFixed(2)} h <span className="hint">({g.count} Einträge)</span>
              </span>
            </div>
          ))
        ) : (
          <Empty icon="hourglass" text="Keine Daten für diese Gruppierung." />
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Zeiteinträge</h3>
          <span className="hint">{entries.length} Einträge</span>
        </div>

        <div className="table-wrap eval-table-desktop">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Mitarbeiter</th>
                <th>Leistung</th>
                <th>Standort / Objekt</th>
                <th>Zeit</th>
                <th>Pause</th>
                <th style={{ textAlign: 'right' }}>Gesamtzeit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((t) => {
                  const e = getEmp(state, t.employeeId);
                  const c = getCust(state, t.customerId);
                  const svc = getService(state, t.serviceId);
                  const inD = new Date(t.clockIn);
                  const outD = t.clockOut ? new Date(t.clockOut) : null;
                  return (
                    <tr key={t.id} onClick={() => actions.openTimeEntryPanel(t.id)} style={{ cursor: 'pointer' }}>
                      <td>{fmtDate(inD)}</td>
                      <td>
                        <div className="person">
                          <div className="avatar" style={{ background: e ? colorFor(e.id) : 'var(--ink-faint)' }}>
                            {e ? initials(e.name) : '?'}
                          </div>
                          <span>{e ? e.name : '–'}</span>
                        </div>
                      </td>
                      <td>{svc ? svc.name : <span className="hint">Keine Leistung zugewiesen</span>}</td>
                      <td>{c ? c.name : '–'}</td>
                      <td className="mono">{fmtTimeRange(inD, outD)}</td>
                      <td className="mono">{t.pauseMinutes || 0} min</td>
                      <td className="eval-duration-cell">
                        <span className={`eval-duration-badge ${outD ? '' : 'is-muted'}`}>{outD ? fmtHM(durationMinutes(t)) : 'läuft…'}</span>
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>
                    <Empty icon="hourglass" text="Keine Zeiteinträge für diese Filter." />
                  </td>
                </tr>
              )}
            </tbody>
            {entries.length ? (
              <tfoot>
                <tr className="eval-total-row">
                  <td colSpan={5}>Total</td>
                  <td className="mono">{Math.round(totalPauseMin)} min</td>
                  <td className="eval-duration-cell">
                    <span className="eval-duration-badge">{fmtHM(totalMinutesAll)}</span>
                  </td>
                  <td className="hint">{entries.length} Einträge</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        <div className="eval-table-mobile">
          {entries.length ? (
            <>
              {entries.map((t) => {
                const e = getEmp(state, t.employeeId);
                const c = getCust(state, t.customerId);
                const svc = getService(state, t.serviceId);
                const inD = new Date(t.clockIn);
                const outD = t.clockOut ? new Date(t.clockOut) : null;
                return (
                  <div key={t.id} className="eval-card" onClick={() => actions.openTimeEntryPanel(t.id)}>
                    <div className="eval-card-top">
                      <div className="person">
                        <div className="avatar" style={{ background: e ? colorFor(e.id) : 'var(--ink-faint)' }}>
                          {e ? initials(e.name) : '?'}
                        </div>
                        <div>
                          <div className="name">{e ? e.name : '–'}</div>
                          <div className="eval-card-meta">{fmtDate(inD)}</div>
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="eval-card-meta">{svc ? svc.name : 'Keine Leistung zugewiesen'}</div>
                    <div className="eval-card-meta">{c ? c.name : '–'}</div>
                    <div className="eval-card-foot">
                      <div>
                        <div className="eval-card-time mono">{fmtTimeRange(inD, outD)}</div>
                        <div className="eval-card-meta">Pause {t.pauseMinutes || 0} min</div>
                      </div>
                      <span className={`eval-duration-badge ${outD ? '' : 'is-muted'}`}>{outD ? fmtHM(durationMinutes(t)) : 'läuft…'}</span>
                    </div>
                  </div>
                );
              })}
              <div className="eval-total-card">
                <span className="label">Total ({entries.length} Einträge · {Math.round(totalPauseMin)} min Pause)</span>
                <span className="value">{fmtHM(totalMinutesAll)}</span>
              </div>
            </>
          ) : (
            <Empty icon="hourglass" text="Keine Zeiteinträge für diese Filter." />
          )}
        </div>
      </div>
    </>
  );
}
