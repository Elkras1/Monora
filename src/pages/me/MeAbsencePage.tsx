import React from 'react';
import { useApp, useHasPerm } from '../../state/AppContext';
import { AbsenceTypeBadge, StatusBadge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { KpiCard } from '../../components/ui/KpiCard';
import { AbsenceCalendar } from '../../components/AbsenceCalendar';
import { fmtDate, isoDate } from '../../utils/date';

const VIEW_TABS = [
  { id: 'list', label: 'Liste' },
  { id: 'month', label: 'Monat' },
  { id: 'year', label: 'Jahr' },
] as const;

export function MeAbsencePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const view = state.filter.absView || 'list';
  const mine = [...state.absences].filter((a) => a.employeeId === state.currentUserId).sort((a, b) => b.start.localeCompare(a.start));

  const todayIso = isoDate(new Date());
  const openCount = mine.filter((a) => a.status === 'beantragt').length;
  const approvedCount = mine.filter((a) => a.status === 'genehmigt').length;
  const currentlyAbsent = mine.some((a) => a.status === 'genehmigt' && a.start <= todayIso && a.end >= todayIso);

  return (
    <>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <KpiCard icon="absence" label="Offene Anträge" value={openCount} bg="var(--amber-tint)" fg="#93670A" delta="zur Prüfung" />
        <KpiCard icon="check" label="Genehmigt" value={approvedCount} bg="var(--primary-tint)" fg="var(--primary-dark)" delta="insgesamt" />
        <KpiCard
          icon="users2"
          label="Aktuell abwesend"
          value={currentlyAbsent ? 'Ja' : 'Nein'}
          bg="var(--surface-alt)"
          fg="var(--ink-soft)"
          delta="heute"
        />
      </div>

      <div className="toolbar">
        <div className="sub" style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>
          {mine.length} Anträge
        </div>
        {hasPerm('absence_request') ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('meAbsence')}>
            <Icon name="plus" /> Abwesenheit hinzufügen
          </button>
        ) : null}
      </div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {VIEW_TABS.map((v) => (
          <button key={v.id} className={`tab ${view === v.id ? 'active' : ''}`} onClick={() => actions.setFilter({ absView: v.id })}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'list' ? (
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
      ) : (
        <div className="card">
          {mine.length ? <AbsenceCalendar absences={mine} mode={view} /> : <Empty icon="absence" text="Noch keine Abwesenheiten beantragt." />}
        </div>
      )}
    </>
  );
}
