import React from 'react';
import { useApp, useHasPerm, useIsAdmin } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { KpiCard } from '../components/ui/KpiCard';
import { StatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { StampWidget } from '../components/StampWidget';
import { TimeEvaluation } from '../components/TimeEvaluation';
import { colorFor, initials } from '../utils/format';
import { fmtDate, fmtTime, isoDate, mondayOf } from '../utils/date';
import { buildExportRows, downloadFile, printRowsAsPdf, rowsToCsv } from '../utils/export';
import type { TimeEntry, TimeEntryStatus } from '../types';

export function ClockPage() {
  const { state, actions, toast } = useApp();
  const hasPerm = useHasPerm();
  const isAdmin = useIsAdmin();
  const f = state.filter;

  const canAll = hasPerm('time_view_all');
  const clockTab = canAll ? f.clockTab ?? 'entries' : 'entries';
  const canManual = hasPerm('time_manual_create');
  const canEditAny = hasPerm('time_edit') || hasPerm('time_correct') || hasPerm('time_confirm');
  const canExport = hasPerm('time_export');

  const filteredTimeEntries = (): TimeEntry[] => {
    let entries = [...state.timeEntries];
    if (!canAll) entries = entries.filter((t) => t.employeeId === state.currentUserId);
    if (f.teEmp && f.teEmp !== 'alle') entries = entries.filter((t) => t.employeeId === f.teEmp);
    if (f.teCust && f.teCust !== 'alle') entries = entries.filter((t) => t.customerId === f.teCust);
    if (f.teStatus && f.teStatus !== 'alle') entries = entries.filter((t) => t.status === f.teStatus);
    if (f.tePeriod === 'custom') {
      if (f.teDateFrom) entries = entries.filter((t) => isoDate(new Date(t.clockIn)) >= (f.teDateFrom as string));
      if (f.teDateTo) entries = entries.filter((t) => isoDate(new Date(t.clockIn)) <= (f.teDateTo as string));
    } else if (f.tePeriod && f.tePeriod !== 'alle') {
      const now = new Date();
      let start: Date;
      if (f.tePeriod === 'heute') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (f.tePeriod === 'woche') start = mondayOf(now);
      else start = new Date(now.getFullYear(), now.getMonth(), 1);
      entries = entries.filter((t) => new Date(t.clockIn) >= start);
    }
    return entries.sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  };

  const entries = filteredTimeEntries();
  const counts: Record<TimeEntryStatus, number> = { offen: 0, bestätigt: 0, korrigiert: 0 };
  (canAll ? state.timeEntries : state.timeEntries.filter((t) => t.employeeId === state.currentUserId)).forEach((t) => {
    counts[t.status]++;
  });

  const openCorrections = state.timeCorrections.filter((c) => c.status === 'offen');

  const exportEmpLabel = f.teEmp && f.teEmp !== 'alle' ? getEmp(state, f.teEmp)?.name : null;
  const exportCustLabel = f.teCust && f.teCust !== 'alle' ? getCust(state, f.teCust)?.name : null;
  const exportTitleParts = [exportEmpLabel, exportCustLabel].filter(Boolean) as string[];
  const exportTitle = `Zeiterfassung${exportTitleParts.length ? ' – ' + exportTitleParts.join(' · ') : ''}`;
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const exportFileBase = ['zeiterfassung', exportEmpLabel && slug(exportEmpLabel), exportCustLabel && slug(exportCustLabel), isoDate(new Date())]
    .filter(Boolean)
    .join('_');

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
    const ok = printRowsAsPdf(rows, exportTitle);
    if (!ok) {
      toast('Popup wurde blockiert. Bitte Popups für diese Seite erlauben.');
      return;
    }
    toast('PDF-Druckansicht geöffnet – im Druckdialog „Als PDF speichern“ wählen.');
  };

  return (
    <>
      {canAll ? (
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${clockTab === 'entries' ? 'active' : ''}`} onClick={() => actions.setFilter({ clockTab: 'entries' })}>
            Zeiterfassungen
          </button>
          <button className={`tab ${clockTab === 'eval' ? 'active' : ''}`} onClick={() => actions.setFilter({ clockTab: 'eval' })}>
            Auswertung
          </button>
        </div>
      ) : null}

      {clockTab === 'eval' ? (
        <TimeEvaluation />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            {canManual ? (
              <StampWidget />
            ) : (
          <Empty
            icon="clock"
            text={
              <>
                Du hast keine Berechtigung, Zeiten für andere manuell zu erfassen.
                <br />
                Frag deinen Administrator nach der Berechtigung „Manuelle Zeiteinträge erstellen“.
              </>
            }
          />
        )}
      </div>

      {canEditAny ? (
        <>
          <div className="card-head" style={{ marginBottom: 2 }}>
            <h3 style={{ fontSize: 16 }}>Zeiterfassung verwalten</h3>
          </div>
          <div className="grid cols-4" style={{ marginBottom: 16 }}>
            <KpiCard icon="clock" label="Offen" value={counts.offen} bg="var(--amber-tint)" fg="#93670A" delta="zur Prüfung" />
            <KpiCard
              icon="check"
              label="Bestätigt"
              value={counts['bestätigt']}
              bg="var(--primary-tint)"
              fg="var(--primary-dark)"
              delta="abgeschlossen"
            />
            <KpiCard
              icon="edit"
              label="Korrigiert"
              value={counts.korrigiert}
              bg="#E3EDF7"
              fg="#2A6FA8"
              delta="nachträglich angepasst"
            />
            <KpiCard
              icon="hourglass"
              label="Gesamt"
              value={state.timeEntries.length}
              bg="var(--surface-alt)"
              fg="var(--ink-soft)"
              delta="alle Einträge"
            />
          </div>
        </>
      ) : null}

      <div className="toolbar">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canAll ? (
            <select value={f.teEmp ?? 'alle'} onChange={(e) => actions.setFilter({ teEmp: e.target.value })}>
              <option value="alle">Alle Mitarbeiter</option>
              {state.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          ) : null}
          <select value={f.tePeriod ?? 'alle'} onChange={(e) => actions.setFilter({ tePeriod: e.target.value })}>
            <option value="alle">Gesamter Zeitraum</option>
            <option value="heute">Heute</option>
            <option value="woche">Diese Woche</option>
            <option value="monat">Dieser Monat</option>
            <option value="custom">Benutzerdefiniert…</option>
          </select>
          {f.tePeriod === 'custom' ? (
            <>
              <input
                type="date"
                value={f.teDateFrom ?? ''}
                onChange={(e) => actions.setFilter({ teDateFrom: e.target.value })}
                aria-label="Von"
              />
              <input
                type="date"
                value={f.teDateTo ?? ''}
                onChange={(e) => actions.setFilter({ teDateTo: e.target.value })}
                aria-label="Bis"
              />
            </>
          ) : null}
          <select value={f.teCust ?? 'alle'} onChange={(e) => actions.setFilter({ teCust: e.target.value })}>
            <option value="alle">Alle Reinigungsobjekte</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={f.teStatus ?? 'alle'} onChange={(e) => actions.setFilter({ teStatus: e.target.value })}>
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
      {!canAll ? (
        <div className="hint" style={{ marginBottom: 10 }}>
          Du siehst nur deine eigenen Einträge (Berechtigung „Alle Arbeitszeiten anzeigen“ ist deaktiviert).
        </div>
      ) : null}
      {canExport ? (
        <div className="hint" style={{ marginBottom: 10 }}>
          Export berücksichtigt die aktuell gewählten Filter ({entries.length} Einträge{exportTitleParts.length ? ` · ${exportTitleParts.join(' · ')}` : ''}).
        </div>
      ) : null}

      <div className="card">
        <div className="card-head">
          <h3>Zeiteinträge</h3>
          <span className="hint">{entries.length} Einträge</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Reinigungsobjekt</th>
                <th>Datum</th>
                <th>Kommen</th>
                <th>Gehen</th>
                <th>Pause</th>
                <th>Dauer</th>
                <th>Status</th>
                <th>Letzte Änderung</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((t) => {
                  const e = getEmp(state, t.employeeId);
                  const c = getCust(state, t.customerId);
                  if (!e) return null;
                  const inD = new Date(t.clockIn);
                  const outD = t.clockOut ? new Date(t.clockOut) : null;
                  const dur = outD ? (outD.getTime() - inD.getTime()) / 60000 - (t.pauseMinutes || 0) : null;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => canEditAny && actions.openTimeEntryPanel(t.id)}
                      style={canEditAny ? { cursor: 'pointer' } : undefined}
                    >
                      <td>
                        <div className="person">
                          <div className="avatar" style={{ background: colorFor(e.id) }}>
                            {initials(e.name)}
                          </div>
                          <span>{e.name}</span>
                        </div>
                      </td>
                      <td>{c ? c.name : '–'}</td>
                      <td>{fmtDate(inD)}</td>
                      <td className="mono">{fmtTime(inD)}</td>
                      <td className="mono">
                        {outD ? fmtTime(outD) : <span style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>läuft…</span>}
                      </td>
                      <td className="mono">{t.pauseMinutes || 0} min</td>
                      <td className="mono">{dur !== null ? `${Math.round(dur)} min` : '–'}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="hint">
                        {fmtDate(new Date(t.updatedAt))} {fmtTime(new Date(t.updatedAt))}
                      </td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {hasPerm('time_confirm') && t.status !== 'bestätigt' && outD ? (
                            <button className="icon-btn" title="Bestätigen" onClick={() => actions.quickSetStatus(t.id, 'bestätigt')}>
                              <Icon name="check" />
                            </button>
                          ) : null}
                          {canEditAny ? (
                            <button className="icon-btn" title="Bearbeiten" onClick={() => actions.openTimeEntryPanel(t.id)}>
                              <Icon name="edit" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10}>
                    <Empty icon="clock" text="Keine Einträge für diese Filter gefunden." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && openCorrections.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>Korrekturanfragen</h3>
            <span className="hint">{openCorrections.length} offen</span>
          </div>
          {openCorrections.map((c) => {
            const e = getEmp(state, c.employeeId);
            return (
              <div
                key={c.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12.8 }}>{e?.name ?? '–'}</div>
                  <div className="hint">{c.note}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => actions.openTimeEntryPanel(c.entryId)}>
                    <Icon name="edit" /> Eintrag öffnen
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => actions.resolveCorrection(c.id, 'erledigt')}>
                    <Icon name="check" /> Erledigt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
        </>
      )}
    </>
  );
}
