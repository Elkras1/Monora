import React from 'react';
import { Icon, IconName } from './icons/Icon';
import { Empty } from './ui/Empty';

/** Maximale Zeilenanzahl der Dashboard-To-do-Listen (Tickets UND Materialanfragen) — beide Bereiche zeigen
 * bewusst gleich viele, nach Dringlichkeit sortierte Einträge (siehe DashboardPage.tsx), damit die Karten
 * kompakt bleiben. Die tatsächliche Gesamtzahl offener Vorgänge steht separat im Kartenkopf ("N offen"). */
export const DASH_WORKLIST_MAX_ROWS = 5;

interface DashboardWorkListProps<T> {
  title: string;
  onAdd?: () => void;
  addTooltip: string;
  /** Gesamtzahl aller offenen Vorgänge (nicht nur der angezeigten Zeilen) — erscheint rechts im Kartenkopf. */
  totalCount: number;
  items: T[];
  getKey: (item: T) => string;
  rowClassName: (item: T) => string;
  onRowClick: (item: T) => void;
  onComplete?: (item: T) => void;
  completeTooltip: string;
  renderName: (item: T) => React.ReactNode;
  renderMeta: (item: T) => React.ReactNode;
  renderDue: (item: T) => React.ReactNode;
  isOverdue?: (item: T) => boolean;
  emptyIcon: IconName;
  emptyText: string;
}

/**
 * Gemeinsame Dashboard-Arbeitsliste für Tickets UND Materialanfragen (siehe DashboardPage.tsx, Module
 * "kpi-tickets"/"kpi-materials") — beide Bereiche sind zwei Varianten derselben Komponente: gleicher
 * Kartenkopf (Titel links, rechts "+" und "N offen"), gleiche Zeilenstruktur (Titel/Objekt links,
 * Fälligkeit rechts, blauer Haken ganz rechts), gleiche Fälligkeitsfarben. Die Datenquellen bleiben
 * getrennt; Sortierung/Filterung/Kürzung übernimmt der Aufrufer.
 */
export function DashboardWorkList<T>({
  title,
  onAdd,
  addTooltip,
  totalCount,
  items,
  getKey,
  rowClassName,
  onRowClick,
  onComplete,
  completeTooltip,
  renderName,
  renderMeta,
  renderDue,
  isOverdue,
  emptyIcon,
  emptyText,
}: DashboardWorkListProps<T>) {
  return (
    <>
      <div className="card-head">
        <h3>{title}</h3>
        <div className="dash-head-right">
          {onAdd ? (
            <button className="dash-header-add-btn" title={addTooltip} onClick={onAdd}>
              <Icon name="plus" />
            </button>
          ) : null}
          <span className="dash-open-count">{totalCount} offen</span>
        </div>
      </div>
      <div className="dash-worklist-body">
        {items.length ? (
          items.map((item) => (
            <div key={getKey(item)} className={`dash-worklist-row ${rowClassName(item)}`} onClick={() => onRowClick(item)}>
              <div className="dash-worklist-info">
                <div className="dash-worklist-name">{renderName(item)}</div>
                <div className="dash-worklist-meta">{renderMeta(item)}</div>
              </div>
              <div className={`dash-worklist-due ${isOverdue?.(item) ? 'is-overdue' : ''}`}>{renderDue(item)}</div>
              {onComplete ? (
                <button
                  className="dash-worklist-check-btn"
                  title={completeTooltip}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete(item);
                  }}
                >
                  <Icon name="check" />
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <Empty icon={emptyIcon} text={emptyText} />
        )}
      </div>
    </>
  );
}
