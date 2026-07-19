import React, { useMemo } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp, getService } from '../state/selectors';
import { KpiCard } from './ui/KpiCard';
import { StatusBadge } from './ui/Badge';
import { Empty } from './ui/Empty';
import { Icon } from './icons/Icon';
import { colorFor, initials } from '../utils/format';
import { fmtDate, isoDate } from '../utils/date';
import { buildExportRows, downloadFile, printRowsAsPdf, rowsToCsv } from '../utils/export';
import type { TimeEntry } from '../types';

const GROUP_OPTIONS = [
  { id: 'none', label: 'Keine Gruppierung' },
  { id: 'employee', label: 'Mitarbeiter' },
  { id: 'customer', label: 'Standort' },
  { id: 'service', label: 'Leistung' },
  { id: 'day', label: 'Datum' },
] as const;

const TABLE_COLS = 9;

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

interface GroupSection {
  key: string;
  label: string;
  entries: TimeEntry[];
  hours: number;
}

export function TimeEvaluation() {
  const { state, actions, toast } = useApp();
  const hasPerm = useHasPerm();
  const f = state.filter;
  const canExport = hasPerm('time_export');
  const canConfirm = hasPerm('time_confirm');

  const now = new Date();
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const dateFrom = f.evalDateFrom || monthStart;
  const dateTo = f.evalDateTo || monthEnd;
  const groupBy = f.evalGroupBy ?? 'none';
  const sortDir = f.evalSortDir ?? 'asc';

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
      .sort((a, b) =>
        sortDir === 'asc'
          ? new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
          : new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
      );
  }, [state.timeEntries, dateFrom, dateTo, f.evalEmp, f.evalService, f.evalCust, f.evalStatus, sortDir]);

  const totalHours = entries.reduce((s, t) => s + durationHours(t), 0);
  const confirmedHours = entries.filter((t) => t.status === 'bestätigt').reduce((s, t) => s + durationHours(t), 0);
  const openHours = entries.filter((t) => t.status === 'offen').reduce((s, t) => s + durationHours(t), 0);
  // Weiterhin berechnet (nur nicht mehr als eigene Dashboard-Kennzahl angezeigt, siehe Kennzahlen-Bereich unten).
  const correctedHours = entries.filter((t) => t.status === 'korrigiert').reduce((s, t) => s + durationHours(t), 0);
  const totalPauseMin = entries.reduce((s, t) => s + (t.pauseMinutes || 0), 0);
  const employeeCount = new Set(entries.map((t) => t.employeeId)).size;
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
      default:
        return '';
    }
  }

  // Reihenfolge der Gruppen = erstes Auftreten in den (bereits chronologisch sortierten) Einträgen —
  // bei Gruppierung nach Datum ergibt das automatisch eine chronologische Gruppenreihenfolge.
  const sections: GroupSection[] | null = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, GroupSection>();
    entries.forEach((t) => {
      const label = groupLabelFor(t);
      const cur = map.get(label) ?? { key: label, label, entries: [], hours: 0 };
      cur.entries.push(t);
      cur.hours += durationHours(t);
      map.set(label, cur);
    });
    return [...map.values()];
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

  const confirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    actions.quickSetStatus(id, 'bestätigt');
  };

  const actionCell = (t: TimeEntry) => {
    if (t.status === 'bestätigt') {
      return (
        <span className="eval-confirmed-badge">
          <Icon name="check" /> Bestätigt
        </span>
      );
    }
    if (canConfirm && t.clockOut) {
      return (
        <button className="btn btn-accent btn-sm" onClick={(e) => confirm(e, t.id)}>
          <Icon name="check" /> Bestätigen
        </button>
      );
    }
    return null;
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

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <KpiCard icon="hourglass" label="Gesamtstunden" value={`${totalHours.toFixed(2)} h`} bg="var(--surface-alt)" fg="var(--ink-soft)" />
        <KpiCard icon="users2" label="Mitarbeitende" value={employeeCount} bg="#E3EDF7" fg="#2A6FA8" />
        <KpiCard icon="check" label="Bestätigte Stunden" value={`${confirmedHours.toFixed(2)} h`} bg="var(--primary-tint)" fg="var(--primary-dark)" />
        <KpiCard icon="clock" label="Unbestätigte Stunden" value={`${openHours.toFixed(2)} h`} bg="var(--amber-tint)" fg="#93670A" />
      </div>

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="hint" style={{ margin: 0 }}>
              Gruppieren nach
            </span>
            <select value={groupBy} onChange={(e) => actions.setFilter({ evalGroupBy: e.target.value as typeof groupBy })}>
              {GROUP_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <select value={sortDir} onChange={(e) => actions.setFilter({ evalSortDir: e.target.value as typeof sortDir })}>
            <option value="asc">↑ Älteste zuerst</option>
            <option value="desc">↓ Neueste zuerst</option>
          </select>
        </div>
        <span className="hint">{entries.length} Einträge</span>
      </div>

      <div className="card">
        <div className="table-wrap eval-table-desktop">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Mitarbeiter</th>
                <th>Standort</th>
                <th>Leistung</th>
                <th>Zeit</th>
                <th>Gesamtzeit</th>
                <th>Pause</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {!entries.length ? (
                <tr>
                  <td colSpan={TABLE_COLS}>
                    <Empty icon="hourglass" text="Keine Zeiteinträge für diese Filter." />
                  </td>
                </tr>
              ) : (
                (sections
                  ? sections.flatMap((sec) => [
                      <tr key={`h-${sec.key}`} className="eval-group-row">
                        <td colSpan={TABLE_COLS}>
                          <span className="eval-group-label">{sec.label}</span>
                          <span className="eval-group-meta">
                            {sec.entries.length} Einträge · {sec.hours.toFixed(2)} h
                          </span>
                        </td>
                      </tr>,
                      ...sec.entries.map((t) => renderRow(t)),
                    ])
                  : entries.map((t) => renderRow(t)))
              )}
            </tbody>
            {entries.length ? (
              <tfoot>
                <tr className="eval-total-row">
                  <td colSpan={5}>Total</td>
                  <td className="eval-duration-cell">
                    <span className="eval-duration-badge">{fmtHM(totalMinutesAll)}</span>
                  </td>
                  <td className="mono">{Math.round(totalPauseMin)} min</td>
                  <td className="hint">{entries.length} Einträge</td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        <div className="eval-table-mobile">
          {!entries.length ? (
            <Empty icon="hourglass" text="Keine Zeiteinträge für diese Filter." />
          ) : (
            <>
              {sections
                ? sections.flatMap((sec) => [
                    <div key={`h-${sec.key}`} className="eval-group-row-mobile">
                      <span className="eval-group-label">{sec.label}</span>
                      <span className="eval-group-meta">
                        {sec.entries.length} Einträge · {sec.hours.toFixed(2)} h
                      </span>
                    </div>,
                    ...sec.entries.map((t) => renderCard(t)),
                  ])
                : entries.map((t) => renderCard(t))}
              <div className="eval-total-card">
                <span className="label">
                  Total ({entries.length} Einträge · {Math.round(totalPauseMin)} min Pause)
                </span>
                <span className="value">{fmtHM(totalMinutesAll)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  function renderRow(t: TimeEntry) {
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
        <td>{c ? c.name : '–'}</td>
        <td>{svc ? svc.name : <span className="hint">Keine Leistung zugewiesen</span>}</td>
        <td className="mono">{fmtTimeRange(inD, outD)}</td>
        <td className="eval-duration-cell">
          <span className={`eval-duration-badge ${outD ? '' : 'is-muted'}`}>{outD ? fmtHM(durationMinutes(t)) : 'läuft…'}</span>
        </td>
        <td className="mono">{t.pauseMinutes || 0} min</td>
        <td>
          <StatusBadge status={t.status} />
        </td>
        <td onClick={(e) => e.stopPropagation()}>{actionCell(t)}</td>
      </tr>
    );
  }

  function renderCard(t: TimeEntry) {
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
        {t.status === 'bestätigt' || (canConfirm && t.clockOut) ? (
          <div className="eval-card-action" onClick={(e) => e.stopPropagation()}>
            {actionCell(t)}
          </div>
        ) : null}
      </div>
    );
  }
}
