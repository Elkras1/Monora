import React, { useEffect, useState } from 'react';
import { Icon } from './icons/Icon';
import { Empty } from './ui/Empty';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { materialItemName } from '../utils/format';
import { fmtDate, fmtTime } from '../utils/date';
import type { MaterialRequestStatus } from '../types';

type OverviewFilter = 'offen' | 'erledigt' | 'alle';

const STATUS_STYLE: Record<MaterialRequestStatus, { bg: string; fg: string; label: string }> = {
  eingereicht: { bg: 'var(--amber-tint)', fg: '#93670A', label: 'Offen' },
  in_bearbeitung: { bg: '#E3EDF7', fg: '#2A6FA8', label: 'In Bearbeitung' },
  erledigt: { bg: 'var(--green-tint)', fg: 'var(--green)', label: 'Erledigt' },
  abgelehnt: { bg: 'var(--red-tint)', fg: 'var(--red)', label: 'Abgelehnt' },
};

/**
 * Kompakte, scrollbare Listenübersicht aller Materialanfragen fürs Dashboard — bewusst als eigene,
 * schlanke Zeilen-Liste statt Kartenwand, damit auch viele gleichzeitig offene Anfragen auf einen Blick
 * lesbar bleiben. "Öffnen" nutzt weiterhin die bestehende Detailansicht (siehe MaterialRequestPanel.tsx);
 * "Erledigt" ruft direkt die bestehende completeMaterialRequest-Aktion auf, ohne Zwischenschritte.
 */
export function MaterialRequestsOverviewModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canManage = hasPerm('material_manage');
  const [filter, setFilter] = useState<OverviewFilter>('offen');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openCount = state.materialRequests.filter((m) => m.status === 'eingereicht' || m.status === 'in_bearbeitung').length;

  const list = [...state.materialRequests]
    .filter((m) => {
      if (filter === 'offen') return m.status === 'eingereicht' || m.status === 'in_bearbeitung';
      if (filter === 'erledigt') return m.status === 'erledigt';
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const complete = (id: string) => {
    if (window.confirm('Materialanfrage als erledigt markieren?')) {
      actions.completeMaterialRequest(id);
    }
  };

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal mat-overview-modal">
        <div className="modal-head">
          <h3>
            Materialanfragen
            {openCount > 0 ? (
              <span className="badge badge-amber" style={{ marginLeft: 8 }}>
                {openCount} offen
              </span>
            ) : null}
          </h3>
          <button className="close-x" onClick={onClose} aria-label="Schliessen">
            <Icon name="close" />
          </button>
        </div>

        <div className="tabs mat-ov-filters">
          <button className={`tab ${filter === 'offen' ? 'active' : ''}`} onClick={() => setFilter('offen')}>
            Offen
          </button>
          <button className={`tab ${filter === 'erledigt' ? 'active' : ''}`} onClick={() => setFilter('erledigt')}>
            Erledigt
          </button>
          <button className={`tab ${filter === 'alle' ? 'active' : ''}`} onClick={() => setFilter('alle')}>
            Alle
          </button>
        </div>

        <div className="mat-ov-body">
          {list.length ? (
            list.map((m) => {
              const emp = getEmp(state, m.employeeId);
              const cust = getCust(state, m.locationId);
              const isOpen = m.status === 'eingereicht' || m.status === 'in_bearbeitung';
              const style = STATUS_STYLE[m.status];
              return (
                <div key={m.id} className="mat-ov-row">
                  <div className="mat-ov-object">
                    <div className="name">{cust ? cust.name : 'Kein Objekt'}</div>
                    {cust?.address ? <div className="addr">{cust.address}</div> : null}
                  </div>

                  <div className="mat-ov-items">
                    {m.items.length > 2 ? (
                      <>
                        <div className="count">{m.items.length} Artikel</div>
                        <div className="preview">
                          {m.items
                            .slice(0, 2)
                            .map((i) => materialItemName(i, state.materials))
                            .join(', ')}
                          …
                        </div>
                      </>
                    ) : (
                      <div className="preview">
                        {m.items.map((i) => `${materialItemName(i, state.materials)} × ${i.quantity}`).join(', ')}
                      </div>
                    )}
                    <div className="emp">{emp ? emp.name : 'Kein Mitarbeiter'}</div>
                    {m.note ? <div className="note">„{m.note}“</div> : null}
                  </div>

                  <div className="mat-ov-side">
                    <span className="mat-ov-status" style={{ background: style.bg, color: style.fg }}>
                      {style.label}
                    </span>
                    <div className="time">
                      {fmtDate(new Date(m.createdAt))} · {fmtTime(new Date(m.createdAt))}
                    </div>
                    <div className="mat-ov-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => actions.openMaterialRequestPanel(m.id)}>
                        Öffnen
                      </button>
                      {canManage && isOpen ? (
                        <button className="btn btn-accent btn-sm" onClick={() => complete(m.id)}>
                          <Icon name="check" /> Erledigt
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <Empty icon="box" text="Keine Materialanfragen in dieser Ansicht." />
          )}
        </div>
      </div>
    </div>
  );
}
