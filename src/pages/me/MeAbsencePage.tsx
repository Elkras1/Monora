import React from 'react';
import { useApp, useHasPerm } from '../../state/AppContext';
import { AbsenceTypeBadge, StatusBadge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { fmtDate } from '../../utils/date';

export function MeAbsencePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const mine = [...state.absences].filter((a) => a.employeeId === state.currentUserId).sort((a, b) => b.start.localeCompare(a.start));

  return (
    <>
      <div className="toolbar">
        <div className="sub" style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>
          {mine.length} Anträge
        </div>
        {hasPerm('absence_request') ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('meAbsence')}>
            <Icon name="plus" /> Neuer Antrag
          </button>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mine.length ? (
          mine.map((a) => {
            const days = Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 86400000) + 1;
            return (
              <div key={a.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AbsenceTypeBadge type={a.type} />
                  <StatusBadge status={a.status} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 8 }}>
                  {fmtDate(new Date(a.start))} – {fmtDate(new Date(a.end))}
                </div>
                <div className="hint">
                  {days} Tag{days > 1 ? 'e' : ''}
                  {a.note ? ` · ${a.note}` : ''}
                </div>
                {a.status === 'beantragt' ? (
                  <button className="link-btn" style={{ marginTop: 8 }} onClick={() => actions.cancelMyAbsence(a.id)}>
                    Antrag zurückziehen
                  </button>
                ) : null}
              </div>
            );
          })
        ) : (
          <Empty icon="absence" text="Noch keine Abwesenheiten beantragt." />
        )}
      </div>
    </>
  );
}
