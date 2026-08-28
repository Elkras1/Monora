import React from 'react';
import { Icon, IconName } from './icons/Icon';
import { Empty } from './ui/Empty';

/** Feste Zeilenanzahl für Dashboard-To-do-Listen (Tickets UND Materialanfragen) — beide Bereiche zeigen
 * immer maximal so viele Einträge, damit die Karten unabhängig vom tatsächlichen Inhalt gleich hoch bleiben
 * (siehe ROW_HEIGHT_PX unten und DashboardPage.tsx, wo beide Listen hierauf zurechtgeschnitten werden). */
export const DASH_WORKLIST_MAX_ROWS = 6;

/** Feste Mindesthöhe pro Zeile (3 Textzeilen: Titel/Objekt, Untertitel, Datum) — zusammen mit
 * DASH_WORKLIST_MAX_ROWS ergibt das eine für Tickets und Materialanfragen identische Kartenhöhe. */
const ROW_HEIGHT_PX = 64;

interface DashboardWorkListProps<T> {
  title: string;
  onAdd?: () => void;
  addTooltip: string;
  items: T[];
  maxRows?: number;
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
 * Gemeinsame Dashboard-Arbeitslisten-Komponente für Tickets UND Materialanfragen (siehe DashboardPage.tsx,
 * Module "kpi-tickets"/"kpi-materials") — beide Bereiche sollen wie zwei Teile derselben Komponente wirken
 * (gleiche Kopfzeile mit "+"-Button, gleiche Zeilenstruktur/-höhe, gleiche Fälligkeitsfarben, gleicher
 * Haken-Button), obwohl ihre Datenquellen (state.tickets / state.materialRequests) getrennt bleiben. Die
 * Sortierung/Filterung übernimmt weiterhin der jeweilige Aufrufer — diese Komponente rendert nur, was sie
 * bekommt, und schneidet nichts selbst ab, damit "maximal N Einträge" an einer einzigen Stelle (dem
 * Aufrufer) entschieden wird.
 */
export function DashboardWorkList<T>({
  title,
  onAdd,
  addTooltip,
  items,
  maxRows = DASH_WORKLIST_MAX_ROWS,
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
        {onAdd ? (
          <button className="dash-header-add-btn" title={addTooltip} onClick={onAdd}>
            <Icon name="plus" />
          </button>
        ) : null}
      </div>
      <div className="dash-worklist-body" style={{ minHeight: maxRows * ROW_HEIGHT_PX }}>
        {items.length ? (
          items.map((item) => (
            <div key={getKey(item)} className={`dash-worklist-row ${rowClassName(item)}`}>
              <div className="dash-worklist-info" onClick={() => onRowClick(item)}>
                <div className="dash-worklist-name">{renderName(item)}</div>
                <div className="dash-worklist-meta">{renderMeta(item)}</div>
                <div className={`dash-worklist-due ${isOverdue?.(item) ? 'is-overdue' : ''}`}>{renderDue(item)}</div>
              </div>
              {onComplete ? (
                <div className="dash-worklist-actions">
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
                </div>
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
