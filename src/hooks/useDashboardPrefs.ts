import { useCallback, useEffect, useState } from 'react';

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
}

export const DEFAULT_MAIN_MODULES = ['kpi-active-now', 'kpi-pause', 'mat-new', 'tick-urgent', 'tick-overdue', 'kpi-open-entries'];

const DEFAULT_PREFS: DashboardPrefs = { main: DEFAULT_MAIN_MODULES, more: [] };

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
    return { main: parsed.main, more: parsed.more };
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
