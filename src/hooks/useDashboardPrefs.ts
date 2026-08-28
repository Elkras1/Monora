import { useCallback, useEffect, useState } from 'react';
import { DASHBOARD_MODULES } from '../state/dashboardModules';

/**
 * Persönliche Dashboard-Modul-Auswahl (Admin/Manager) — bewusst reine UI-Präferenz, getrennt vom
 * zentralen App-State/AppData: sie beschreibt nur, wie EIN Benutzer sein Dashboard anordnet, nicht
 * Geschäftsdaten. Pro Benutzer ein eigener localStorage-Eintrag, damit Admin und Manager (und mehrere
 * Manager-Konten) unabhängige Einstellungen haben.
 */
export interface DashboardPrefs {
  /** Modul-IDs im Hauptbereich, in Anzeigereihenfolge. */
  main: string[];
  /** Modul-IDs im einklappbaren Bereich "Weitere Informationen", in Anzeigereihenfolge. */
  more: string[];
  /** Vom Benutzer bewusst ausgeblendete Module. Ohne diese Liste lässt sich "war noch nie sichtbar, weil
   * neu im Katalog" nicht von "wurde bewusst ausgeblendet" unterscheiden — genau das führte zuvor dazu,
   * dass ausgeblendete Module beim nächsten Laden (siehe loadPrefs) wieder eingeblendet wurden, weil sie
   * fälschlich als "neues Modul" behandelt wurden. */
  hidden: string[];
}

export const DEFAULT_MAIN_MODULES = ['kpi-active-now', 'kpi-pause', 'kpi-tickets', 'kpi-materials', 'dash-calendar', 'kpi-open-entries'];

const DEFAULT_PREFS: DashboardPrefs = { main: DEFAULT_MAIN_MODULES, more: [], hidden: [] };

/** Alte Modul-IDs (separate Karten für dringend/überfällig/neu) auf die neuen, konsolidierten Karten
 * abbilden, damit bereits gespeicherte Dashboard-Layouts nicht plötzlich Lücken oder tote IDs enthalten. */
const MODULE_ID_MIGRATION: Record<string, string> = {
  'mat-new': 'kpi-materials',
  'tick-urgent': 'kpi-tickets',
  'tick-overdue': 'kpi-tickets',
  'ticket-calendar-today': 'kpi-tickets',
  'ticket-status-overview': 'kpi-tickets',
};

function migrateModuleIds(ids: string[]): string[] {
  const mapped = ids.map((id) => MODULE_ID_MIGRATION[id] ?? id);
  return mapped.filter((id, i) => mapped.indexOf(id) === i);
}

const ALL_MODULE_IDS = DASHBOARD_MODULES.map((m) => m.id);

function keyFor(userId: string): string {
  return `monora-dashboard-prefs-${userId}`;
}

function loadPrefs(userId: string | null): DashboardPrefs {
  if (!userId) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.main) || !Array.isArray(parsed?.more)) return DEFAULT_PREFS;
    const hidden = migrateModuleIds(Array.isArray(parsed.hidden) ? parsed.hidden : []);
    const main = migrateModuleIds(parsed.main).filter((id) => !hidden.includes(id));
    const more = migrateModuleIds(parsed.more).filter((id) => !main.includes(id) && !hidden.includes(id));
    // Module, die es beim letzten Speichern noch nicht gab (später neu hinzugekommene Katalog-Einträge),
    // hinten an "main" anhängen statt die gespeicherte Reihenfolge zu verwerfen oder das Modul verschwinden
    // zu lassen — die bestehende Benutzerreihenfolge selbst bleibt dabei unangetastet. "hidden" zählt dabei
    // ausdrücklich als "bekannt", sonst würden bewusst ausgeblendete Module hier fälschlich wieder auftauchen.
    const known = new Set([...main, ...more, ...hidden]);
    const withNewModules = [...main, ...ALL_MODULE_IDS.filter((id) => !known.has(id))];
    return { main: withNewModules, more, hidden };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useDashboardPrefs(userId: string | null) {
  const [prefs, setPrefs] = useState<DashboardPrefs>(() => loadPrefs(userId));

  // Beim Rollen-/Konto-Wechsel (Demo-Rollenwechsel) die passenden, getrennten Einstellungen laden.
  useEffect(() => {
    setPrefs(loadPrefs(userId));
  }, [userId]);

  const save = useCallback(
    (next: DashboardPrefs) => {
      setPrefs(next);
      if (!userId) return;
      try {
        localStorage.setItem(keyFor(userId), JSON.stringify(next));
      } catch {
        /* ignore quota errors in demo mode */
      }
    },
    [userId]
  );

  const reset = useCallback(() => {
    if (userId) {
      try {
        localStorage.removeItem(keyFor(userId));
      } catch {
        /* ignore */
      }
    }
    setPrefs(DEFAULT_PREFS);
  }, [userId]);

  return { prefs, save, reset };
}
