import type { AppData, TimeEntry } from '../types';
import { getCust, getEmp, getService } from '../state/selectors';
import { fmtDate, fmtTime } from './date';

export interface ExportRow {
  employee: string;
  service: string;
  customer: string;
  date: string;
  start: string;
  end: string;
  pause: string;
  total: string;
  status: string;
  checkInDistance: string;
  checkOutDistance: string;
}

const EXPORT_HEADERS = [
  'Mitarbeiter',
  'Leistung',
  'Objekt',
  'Datum',
  'Startzeit',
  'Endzeit',
  'Pause',
  'Gesamtzeit',
  'Status',
  'Check-in Entfernung',
  'Check-out Entfernung',
];

/** Builds flat, printable/exportable rows from time entries (used by both CSV and PDF export). */
export function buildExportRows(data: AppData, entries: TimeEntry[]): ExportRow[] {
  return entries.map((t) => {
    const e = getEmp(data, t.employeeId);
    const c = getCust(data, t.customerId);
    const svc = getService(data, t.serviceId);
    const inD = new Date(t.clockIn);
    const outD = t.clockOut ? new Date(t.clockOut) : null;
    const totalMin = outD ? (outD.getTime() - inD.getTime()) / 60000 - (t.pauseMinutes || 0) : null;
    return {
      employee: e ? e.name : '–',
      service: svc ? svc.name : 'Keine Leistung zugewiesen',
      customer: c ? c.name : '–',
      date: fmtDate(inD),
      start: fmtTime(inD),
      end: outD ? fmtTime(outD) : 'läuft…',
      pause: `${t.pauseMinutes || 0} min`,
      total: totalMin !== null ? `${Math.round(totalMin)} min` : '–',
      status: t.status,
      checkInDistance: `${Math.round(t.checkInDistance)} m`,
      checkOutDistance: t.checkOutDistance !== null ? `${Math.round(t.checkOutDistance)} m` : '–',
    };
  });
}

function csvCell(value: string): string {
  return /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Semicolon-delimited CSV with a UTF-8 BOM so umlauts and column splitting work correctly when opened directly in Excel. */
export function rowsToCsv(rows: ExportRow[]): string {
  const lines = [
    EXPORT_HEADERS.join(';'),
    ...rows.map((r) =>
      [r.employee, r.service, r.customer, r.date, r.start, r.end, r.pause, r.total, r.status, r.checkInDistance, r.checkOutDistance]
        .map(csvCell)
        .join(';')
    ),
  ];
  return '﻿' + lines.join('\r\n');
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Opens a print-formatted window with the export rows and triggers the browser print dialog,
 * so the user can save it as a PDF ("Als PDF speichern") without any extra library or backend.
 */
export function printRowsAsPdf(rows: ExportRow[], title: string): boolean {
  const win = window.open('', '_blank', 'width=1000,height=720');
  if (!win) return false;

  const tableRows = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.employee)}</td><td>${escapeHtml(r.service)}</td><td>${escapeHtml(r.customer)}</td><td>${escapeHtml(r.date)}</td>` +
        `<td>${escapeHtml(r.start)}</td><td>${escapeHtml(r.end)}</td><td>${escapeHtml(r.pause)}</td>` +
        `<td>${escapeHtml(r.total)}</td><td>${escapeHtml(r.status)}</td>` +
        `<td>${escapeHtml(r.checkInDistance)}</td><td>${escapeHtml(r.checkOutDistance)}</td></tr>`
    )
    .join('');

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#0B1E3D;padding:24px;}
  h1{font-size:18px;margin:0 0 4px;}
  .meta{font-size:11px;color:#5b6b85;margin-bottom:18px;}
  table{width:100%;border-collapse:collapse;font-size:11px;}
  th,td{border:1px solid #d5dbe6;padding:6px 8px;text-align:left;}
  th{background:#f2f5fa;font-weight:700;}
  tr:nth-child(even){background:#fafbfd;}
  @media print{ body{padding:0;} }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Erstellt am ${new Date().toLocaleString('de-CH')} · ${rows.length} Einträge</div>
  <table>
    <thead><tr>${EXPORT_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${tableRows || `<tr><td colspan="${EXPORT_HEADERS.length}">Keine Einträge für diese Filter.</td></tr>`}</tbody>
  </table>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
