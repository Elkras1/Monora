import React, { useMemo, useState } from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { AbsenceTypeBadge, StatusBadge, absenceTypeColor, absenceTypeLabel } from './ui/Badge';
import { useApp } from '../state/AppContext';
import { Empty } from './ui/Empty';
import type { Absence, Employee } from '../types';
import { fmtDate, isoDate, pad, WEEKDAYS } from '../utils/date';
import { colorFor, initials } from '../utils/format';

type DragMode = 'move' | 'resize-start' | 'resize-end';
const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const ABS_TYPES: Absence['type'][] = ['Urlaub', 'Krankheit', 'Unfall', 'Unbezahlt', 'Sonstiges'];

function isoDay(iso: string): number {
  return Number(iso.slice(8, 10));
}

function isoWeekNum(iso: string): number {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** Greedy interval-scheduling lane assignment so overlapping absences stack instead of collide. */
function assignLanes(items: Absence[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start));
  const laneEnds: string[] = [];
  const laneOf = new Map<string, number>();
  for (const a of sorted) {
    let lane = laneEnds.findIndex((end) => end < a.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(a.end);
    } else {
      laneEnds[lane] = a.end;
    }
    laneOf.set(a.id, lane);
  }
  return laneOf;
}

export function AbsenceMatrix({
  mode,
  employees,
  absences,
  canManage,
  canCreate,
}: {
  mode: 'month' | 'year';
  employees: Employee[];
  absences: Absence[];
  canManage: boolean;
  canCreate: boolean;
}) {
  const { actions, toast } = useApp();
  const todayIso = isoDate(new Date());
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [yearCursor, setYearCursor] = useState(() => new Date().getFullYear());
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ empId: string; iso: string } | null>(null);

  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name)), [employees]);
  const absByEmp = useMemo(() => {
    const map = new Map<string, Absence[]>();
    for (const e of sortedEmployees) map.set(e.id, []);
    for (const a of absences) {
      if (map.has(a.employeeId)) map.get(a.employeeId)!.push(a);
    }
    return map;
  }, [sortedEmployees, absences]);

  const selectedAbsence = selectedAbsenceId ? absences.find((a) => a.id === selectedAbsenceId) : undefined;
  const selectedEmp = selectedAbsence ? sortedEmployees.find((e) => e.id === selectedAbsence.employeeId) : undefined;

  const onBarDragStart = (e: React.DragEvent, absenceId: string, dragMode: DragMode) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ absenceId, mode: dragMode }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onCellDragOver = (e: React.DragEvent, empId: string, iso: string) => {
    if (!canManage) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget?.empId !== empId || dropTarget?.iso !== iso) setDropTarget({ empId, iso });
  };
  const onCellDragLeave = (empId: string, iso: string) => {
    setDropTarget((d) => (d?.empId === empId && d?.iso === iso ? null : d));
  };
  const onCellDrop = (e: React.DragEvent, empId: string, iso: string) => {
    if (!canManage) return;
    e.preventDefault();
    setDropTarget(null);
    let payload: { absenceId: string; mode: DragMode };
    try {
      payload = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }
    const a = absences.find((x) => x.id === payload.absenceId);
    if (!a) return;
    if (payload.mode === 'move') {
      actions.moveAbsenceTo(a.id, iso, empId);
      toast('Abwesenheit aktualisiert.');
    } else if (payload.mode === 'resize-start') {
      if (iso > a.end) {
        toast('Startdatum kann nicht nach dem Enddatum liegen.');
        return;
      }
      actions.resizeAbsence(a.id, 'start', iso);
    } else if (payload.mode === 'resize-end') {
      if (iso < a.start) {
        toast('Enddatum kann nicht vor dem Startdatum liegen.');
        return;
      }
      actions.resizeAbsence(a.id, 'end', iso);
    }
  };

  const monthYear = monthCursor.getFullYear();
  const monthIdx = monthCursor.getMonth();
  const totalDays = new Date(monthYear, monthIdx + 1, 0).getDate();
  const monthStartIso = `${monthYear}-${pad(monthIdx + 1)}-01`;
  const monthEndIso = `${monthYear}-${pad(monthIdx + 1)}-${pad(totalDays)}`;
  const dayList = useMemo(
    () =>
      [...Array(totalDays)].map((_, i) => {
        const dayNum = i + 1;
        const iso = `${monthYear}-${pad(monthIdx + 1)}-${pad(dayNum)}`;
        const wd = new Date(monthYear, monthIdx, dayNum).getDay();
        return { iso, dayNum, isWeekend: wd === 0 || wd === 6, isMonday: wd === 1, wd: WEEKDAYS[(wd + 6) % 7] };
      }),
    [monthYear, monthIdx, totalDays]
  );

  return (
    <div>
      <div className="abs-matrix-toolbar">
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
          {mode === 'month' ? 'Monatsansicht' : 'Jahresansicht'}
        </div>
        {mode === 'month' ? (
          <div className="week-nav">
            <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
              <Icon name="chevL" />
            </button>
            <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 150, textAlign: 'center', fontSize: 14 }}>
              {monthCursor.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}
            </div>
            <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
              <Icon name="chevR" />
            </button>
          </div>
        ) : (
          <div className="week-nav">
            <button className="icon-btn" onClick={() => setYearCursor((y) => y - 1)}>
              <Icon name="chevL" />
            </button>
            <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 70, textAlign: 'center', fontSize: 14 }}>{yearCursor}</div>
            <button className="icon-btn" onClick={() => setYearCursor((y) => y + 1)}>
              <Icon name="chevR" />
            </button>
          </div>
        )}
      </div>

      <div className="abs-matrix-legend">
        {ABS_TYPES.map((t) => (
          <span key={t}>
            <i style={{ background: absenceTypeColor(t) }} />
            {absenceTypeLabel(t)}
          </span>
        ))}
        {canManage ? <span style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>Balken per Drag &amp; Drop verschieben oder an den Kanten ziehen</span> : null}
      </div>

      {!sortedEmployees.length ? (
        <Empty icon="absence" text="Keine Mitarbeiter in dieser Ansicht." />
      ) : (
        <div className="abs-matrix-scroll">
          <div className="abs-matrix-grid">
            {mode === 'month' ? (
              <>
                <div className="abs-matrix-headrow">
                  <div className="abs-matrix-namecell">Mitarbeiter</div>
                  <div className="abs-matrix-daytrack">
                    {dayList.map((d) => (
                      <div key={d.iso} className={`abs-matrix-daybg ${d.isWeekend ? 'is-weekend' : ''} ${d.iso === todayIso ? 'is-today' : ''}`}>
                        {d.isMonday ? <span className="wk">KW{isoWeekNum(d.iso)}</span> : null}
                        <span className="wd">{d.wd}</span>
                        <span className="dn">{d.dayNum}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {sortedEmployees.map((emp) => {
                  const empAbsences = (absByEmp.get(emp.id) ?? []).filter((a) => a.end >= monthStartIso && a.start <= monthEndIso);
                  const lanes = assignLanes(empAbsences);
                  const maxLane = empAbsences.length ? Math.max(...empAbsences.map((a) => lanes.get(a.id) ?? 0)) : 0;
                  const rowHeight = Math.max(48, 10 + (maxLane + 1) * 24);
                  return (
                    <div className="abs-matrix-row" key={emp.id} style={{ minHeight: rowHeight }}>
                      <div className="abs-matrix-namecell">
                        <div className="avatar" style={{ width: 26, height: 26, fontSize: 11, background: colorFor(emp.id) }}>
                          {initials(emp.name)}
                        </div>
                        <div className="abs-matrix-name-meta">
                          <div className="n">{emp.name}</div>
                          <div className="r">{emp.role}</div>
                        </div>
                      </div>
                      <div className="abs-matrix-daytrack">
                        {dayList.map((d) => (
                          <div
                            key={d.iso}
                            className={`abs-matrix-daybg ${d.isWeekend ? 'is-weekend' : ''} ${d.iso === todayIso ? 'is-today' : ''} ${
                              dropTarget?.empId === emp.id && dropTarget?.iso === d.iso ? 'is-drop-target' : ''
                            }`}
                            onDragOver={(e) => onCellDragOver(e, emp.id, d.iso)}
                            onDragLeave={() => onCellDragLeave(emp.id, d.iso)}
                            onDrop={(e) => onCellDrop(e, emp.id, d.iso)}
                          >
                            {canCreate ? (
                              <button
                                className="abs-matrix-cell-add"
                                title="Abwesenheit hinzufügen"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actions.openModal('absence', { employeeId: emp.id, date: d.iso });
                                }}
                              >
                                <Icon name="plus" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {empAbsences.map((a) => {
                          const startIdx = a.start < monthStartIso ? 0 : isoDay(a.start) - 1;
                          const endIdx = a.end > monthEndIso ? totalDays - 1 : isoDay(a.end) - 1;
                          const lane = lanes.get(a.id) ?? 0;
                          const left = (startIdx / totalDays) * 100;
                          const width = ((endIdx - startIdx + 1) / totalDays) * 100;
                          const days = Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 86400000) + 1;
                          return (
                            <div
                              key={a.id}
                              className={`abs-matrix-bar ${canManage ? 'is-draggable' : ''}`}
                              style={{ left: `${left}%`, width: `${width}%`, top: 4 + lane * 24, background: absenceTypeColor(a.type) }}
                              draggable={canManage}
                              onDragStart={(e) => onBarDragStart(e, a.id, 'move')}
                              onClick={() => setSelectedAbsenceId(a.id)}
                              title={`${absenceTypeLabel(a.type)} · ${fmtDate(new Date(a.start))} – ${fmtDate(new Date(a.end))}`}
                            >
                              {canManage ? (
                                <span
                                  className="abs-matrix-bar-resize is-left"
                                  draggable
                                  onDragStart={(e) => onBarDragStart(e, a.id, 'resize-start')}
                                />
                              ) : null}
                              <span className="abs-matrix-bar-label">
                                {absenceTypeLabel(a.type)}
                                {width > 9 ? ` · ${days}T` : ''}
                              </span>
                              {canManage ? (
                                <span
                                  className="abs-matrix-bar-resize is-right"
                                  draggable
                                  onDragStart={(e) => onBarDragStart(e, a.id, 'resize-end')}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="abs-matrix-headrow">
                  <div className="abs-matrix-namecell">Mitarbeiter</div>
                  <div className="abs-matrix-yeartrack">
                    {MONTH_NAMES.map((mn) => (
                      <div className="abs-matrix-monthhead" key={mn}>
                        {mn}
                      </div>
                    ))}
                  </div>
                </div>
                {sortedEmployees.map((emp) => {
                  const empAbsences = absByEmp.get(emp.id) ?? [];
                  const monthSegments = [...Array(12)].map((_, mi) => {
                    const dim = new Date(yearCursor, mi + 1, 0).getDate();
                    const mStart = `${yearCursor}-${pad(mi + 1)}-01`;
                    const mEnd = `${yearCursor}-${pad(mi + 1)}-${pad(dim)}`;
                    const seg = empAbsences.filter((a) => a.end >= mStart && a.start <= mEnd);
                    const lanes = assignLanes(seg);
                    return { mi, dim, mStart, mEnd, seg, lanes };
                  });
                  const maxLane = Math.max(
                    0,
                    ...monthSegments.flatMap((m) => m.seg.map((a) => m.lanes.get(a.id) ?? 0))
                  );
                  const rowHeight = Math.max(40, 10 + (maxLane + 1) * 17);
                  return (
                    <div className="abs-matrix-row" key={emp.id} style={{ minHeight: rowHeight }}>
                      <div className="abs-matrix-namecell">
                        <div className="avatar" style={{ width: 26, height: 26, fontSize: 11, background: colorFor(emp.id) }}>
                          {initials(emp.name)}
                        </div>
                        <div className="abs-matrix-name-meta">
                          <div className="n">{emp.name}</div>
                          <div className="r">{emp.role}</div>
                        </div>
                      </div>
                      <div className="abs-matrix-yeartrack">
                        {monthSegments.map(({ mi, dim, mStart, mEnd, seg, lanes }) => (
                          <div className="abs-matrix-monthcol" key={mi}>
                            {seg.map((a) => {
                              const startIdx = a.start < mStart ? 0 : isoDay(a.start) - 1;
                              const endIdx = a.end > mEnd ? dim - 1 : isoDay(a.end) - 1;
                              const lane = lanes.get(a.id) ?? 0;
                              const left = (startIdx / dim) * 100;
                              const width = ((endIdx - startIdx + 1) / dim) * 100;
                              return (
                                <div
                                  key={a.id + mi}
                                  className="abs-matrix-year-bar"
                                  style={{ left: `${left}%`, width: `${width}%`, top: 4 + lane * 17, background: absenceTypeColor(a.type) }}
                                  onClick={() => setSelectedAbsenceId(a.id)}
                                  title={`${absenceTypeLabel(a.type)} · ${fmtDate(new Date(a.start))} – ${fmtDate(new Date(a.end))}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {selectedAbsence ? (
        <Drawer title="Abwesenheit" onClose={() => setSelectedAbsenceId(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="avatar" style={{ background: colorFor(selectedEmp?.id ?? '') }}>
              {initials(selectedEmp?.name ?? '?')}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedEmp?.name ?? '–'}</div>
              <div className="hint">{selectedEmp?.role}</div>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <span className="dl">Art</span>
              <span className="dv">
                <AbsenceTypeBadge type={selectedAbsence.type} />
              </span>
            </div>
            <div>
              <span className="dl">Status</span>
              <span className="dv">
                <StatusBadge status={selectedAbsence.status} />
              </span>
            </div>
            <div>
              <span className="dl">Start</span>
              <span className="dv mono">{fmtDate(new Date(selectedAbsence.start))}</span>
            </div>
            <div>
              <span className="dl">Ende</span>
              <span className="dv mono">{fmtDate(new Date(selectedAbsence.end))}</span>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <span className="dl">Notiz</span>
              <span className="dv">{selectedAbsence.note || '–'}</span>
            </div>
          </div>
          {canManage ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              {selectedAbsence.status === 'beantragt' ? (
                <>
                  <button className="btn btn-accent btn-sm" onClick={() => actions.setAbsStatus(selectedAbsence.id, 'genehmigt')}>
                    <Icon name="check" /> Genehmigen
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => actions.setAbsStatus(selectedAbsence.id, 'abgelehnt')}>
                    <Icon name="close" /> Ablehnen
                  </button>
                </>
              ) : null}
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  actions.deleteAbsence(selectedAbsence.id);
                  setSelectedAbsenceId(null);
                }}
              >
                <Icon name="trash" /> Löschen
              </button>
            </div>
          ) : null}
        </Drawer>
      ) : null}
    </div>
  );
}
