import React from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useHasPerm } from '../state/AppContext';
import { DASHBOARD_MODULES } from '../state/dashboardModules';
import { DEFAULT_MAIN_MODULES, type DashboardPrefs } from '../hooks/useDashboardPrefs';

/** "Dashboard anpassen": pro Modul ein Schalter, ob es überhaupt angezeigt wird — Reihenfolge und
 * Haupt-/„Weitere Informationen"-Zuordnung werden separat per Drag & Drop im Bearbeitungsmodus festgelegt. */
export function DashboardSettingsModal({
  prefs,
  onSave,
  onReset,
  onClose,
}: {
  prefs: DashboardPrefs;
  onSave: (next: DashboardPrefs) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const hasPerm = useHasPerm();
  const availableModules = DASHBOARD_MODULES.filter((m) => !m.perm || hasPerm(m.perm));
  const isVisible = (id: string) => prefs.main.includes(id) || prefs.more.includes(id);

  const toggle = (id: string, checked: boolean) => {
    let { main, more } = prefs;
    if (checked) {
      if (!main.includes(id) && !more.includes(id)) {
        if (DEFAULT_MAIN_MODULES.includes(id)) main = [...main, id];
        else more = [...more, id];
      }
    } else {
      main = main.filter((x) => x !== id);
      more = more.filter((x) => x !== id);
    }
    onSave({ main, more });
  };

  return (
    <Modal
      title="Dashboard anpassen"
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-outline"
            onClick={() => {
              if (window.confirm('Persönliche Dashboard-Einstellungen wirklich löschen und Standardansicht wiederherstellen?')) {
                onReset();
              }
            }}
          >
            Standard wiederherstellen
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            <Icon name="check" /> Fertig
          </button>
        </>
      }
    >
      <div className="hint" style={{ marginBottom: 14 }}>
        Wähle, welche Bereiche auf deinem Dashboard erscheinen. Die Anordnung lässt sich anschliessend über
        „Dashboard bearbeiten" per Drag &amp; Drop anpassen.
      </div>
      <div className="dash-settings-list">
        {availableModules.map((m) => (
          <label key={m.id} className="dash-settings-row">
            <span>{m.label}</span>
            <span className={`toggle ${isVisible(m.id) ? 'on' : ''}`} onClick={() => toggle(m.id, !isVisible(m.id))}>
              <span className="toggle-knob" />
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
