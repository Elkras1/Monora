import React, { useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { Icon } from './icons/Icon';
import { Avatar } from './ui/Avatar';
import { useClock } from '../hooks/useClock';
import { pad, fmtTime } from '../utils/date';

function fmtDurationHM(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${pad(h)} h ${pad(m)} min`;
}

/**
 * Kompaktes, eigenständiges Popup für die Dashboard-Kacheln "Aktuell im Einsatz" und "In Pause" —
 * bewusst nicht über die gemeinsame Modal-Komponente gebaut, damit dieses Feature isoliert bleibt und
 * keine anderen Modals im Projekt beeinflusst. Liest direkt aus state.timeEntries (derselbe zentrale
 * Zeiterfassungs-State wie überall sonst), daher spiegeln sich Start/Pause/Ende sofort wider, sobald
 * sich der App-State ändert; die Dauer-Anzeigen ticken zusätzlich per useClock() jede Sekunde mit.
 */
export function LiveStatusListModal({ kind, onClose }: { kind: 'active' | 'pause'; onClose: () => void }) {
  const { state } = useApp();
  const now = useClock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openNow = state.timeEntries.filter((t) => !t.clockOut);
  const list = kind === 'active' ? openNow.filter((t) => !t.pauseStart) : openNow.filter((t) => t.pauseStart);
  const title = kind === 'active' ? 'Aktuell im Einsatz' : 'In Pause';
  const emptyText = kind === 'active' ? 'Aktuell ist niemand im Einsatz.' : 'Aktuell macht niemand Pause.';
  const nowMs = now.getTime();

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal live-list-modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="close-x" onClick={onClose} aria-label="Schliessen">
            <Icon name="close" />
          </button>
        </div>
        <div className="live-list-body">
          {list.length ? (
            list.map((t) => {
              const emp = getEmp(state, t.employeeId);
              const cust = getCust(state, t.customerId);
              if (!emp) return null;
              const clockInMs = new Date(t.clockIn).getTime();
              if (kind === 'active') {
                const workedMs = nowMs - clockInMs - t.pauseMinutes * 60000;
                return (
                  <div key={t.id} className="live-list-row">
                    <Avatar id={emp.id} name={emp.name} photoUrl={emp.photoUrl} size={38} fontSize={14} />
                    <div className="live-list-info">
                      <div className="name">{emp.name}</div>
                      <div className="obj">{cust ? cust.name : '–'}</div>
                      {cust?.address ? <div className="addr">{cust.address}</div> : null}
                      <div className="meta">
                        Eingestempelt: {fmtTime(new Date(t.clockIn))} · Dauer: {fmtDurationHM(workedMs)}
                      </div>
                    </div>
                    <span className="badge badge-mint">
                      <span className="badge-dot" />
                      Im Einsatz
                    </span>
                  </div>
                );
              }
              const pauseStartMs = t.pauseStart ? new Date(t.pauseStart).getTime() : nowMs;
              const pauseMs = nowMs - pauseStartMs;
              return (
                <div key={t.id} className="live-list-row">
                  <Avatar id={emp.id} name={emp.name} photoUrl={emp.photoUrl} size={38} fontSize={14} />
                  <div className="live-list-info">
                    <div className="name">{emp.name}</div>
                    <div className="obj">{cust ? cust.name : '–'}</div>
                    <div className="meta">
                      Eingestempelt: {fmtTime(new Date(t.clockIn))} · Pause seit: {t.pauseStart ? fmtTime(new Date(t.pauseStart)) : '–'}
                    </div>
                    <div className="meta">Pausendauer: {fmtDurationHM(pauseMs)}</div>
                  </div>
                  <span className="badge badge-amber">
                    <span className="badge-dot" />
                    Pause
                  </span>
                </div>
              );
            })
          ) : (
            <div className="empty">
              <Icon name={kind === 'active' ? 'bolt' : 'pause'} />
              <p>{emptyText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
