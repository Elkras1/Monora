import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { Icon } from '../components/icons/Icon';

export function SettingsPage() {
  const { state, actions } = useApp();
  const s = state.settings;

  const [companyName, setCompanyName] = useState(s.companyName);
  const [address, setAddress] = useState(s.address);
  const [weeklyHours, setWeeklyHours] = useState(s.weeklyHours);
  const [rounding, setRounding] = useState(s.rounding);
  const [defaultRadius, setDefaultRadius] = useState(s.defaultRadius);
  const [notifyGeofence, setNotifyGeofence] = useState(s.notifyGeofence);
  const [notifyLate, setNotifyLate] = useState(s.notifyLate);

  const save = () => {
    actions.saveSettings({ companyName, address, weeklyHours, rounding, defaultRadius, notifyGeofence, notifyLate });
  };

  const exportData = () => {
    const data = JSON.stringify(
      {
        employees: state.employees,
        customers: state.customers,
        shifts: state.shifts,
        absences: state.absences,
        timeEntries: state.timeEntries,
        settings: state.settings,
      },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reintrack-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid cols-2">
      <div className="card">
        <div className="settings-section">
          <h3>Unternehmensangaben</h3>
          <div className="desc">Diese Angaben erscheinen auf Auswertungen und Berichten.</div>
          <div className="field">
            <label>Firmenname</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="field">
            <label>Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <div className="settings-section">
          <h3>Arbeitszeitregeln</h3>
          <div className="desc">Grundlage für Soll-Stunden und Rundung der Zeiterfassung.</div>
          <div className="field-row">
            <div className="field">
              <label>Soll-Wochenstunden</label>
              <input type="number" value={weeklyHours} onChange={(e) => setWeeklyHours(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Rundung (Minuten)</label>
              <input type="number" value={rounding} onChange={(e) => setRounding(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>
        <div className="settings-section">
          <h3>Geofencing</h3>
          <div className="desc">Standard-Radius für neu angelegte Standorte.</div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Standard-Radius (Meter)</label>
            <input type="number" value={defaultRadius} onChange={(e) => setDefaultRadius(parseInt(e.target.value) || 0)} />
          </div>
          <div className="checks">
            <label className={`chip-check ${notifyGeofence ? 'on' : ''}`}>
              <input type="checkbox" checked={notifyGeofence} onChange={(e) => setNotifyGeofence(e.target.checked)} style={{ display: 'none' }} />
              <Icon name="check" /> Benachrichtigung bei Geofence-Abweichung
            </label>
            <label className={`chip-check ${notifyLate ? 'on' : ''}`}>
              <input type="checkbox" checked={notifyLate} onChange={(e) => setNotifyLate(e.target.checked)} style={{ display: 'none' }} />
              <Icon name="check" /> Benachrichtigung bei Verspätung
            </label>
          </div>
        </div>
        <button className="btn btn-primary" onClick={save}>
          <Icon name="check" /> Einstellungen speichern
        </button>
      </div>
      <div className="card">
        <div className="card-head">
          <h3>Daten</h3>
        </div>
        <div className="desc" style={{ marginBottom: 12 }}>
          Alle Daten werden automatisch und persönlich in diesem Browser gespeichert (Mock-Daten, keine echte Datenbank).
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-outline" onClick={exportData}>
            Daten als JSON exportieren
          </button>
          <button className="btn btn-danger" onClick={() => actions.resetDemoData()}>
            <Icon name="trash" /> Demo-Daten zurücksetzen
          </button>
        </div>
        <div className="divider" />
        <div className="hint">Version 1.0 · Planico Web-App · Für Reinigungsunternehmen entwickelt</div>
        <div className="divider" />
        <div className="card-head" style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 13 }}>Rollen & Berechtigungen</h3>
        </div>
        <div className="desc" style={{ marginBottom: 10 }}>
          Lege fest, welche Funktionen Manager und Mitarbeitende verwenden dürfen.
        </div>
        <button className="btn btn-outline" onClick={() => actions.setView('permissions')}>
          <Icon name="bolt" /> Berechtigungsmatrix öffnen
        </button>
      </div>
    </div>
  );
}
