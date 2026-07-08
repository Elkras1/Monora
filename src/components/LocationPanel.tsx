import React, { useState } from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { IssueBadge } from './ui/Badge';
import { useApp, useHasPerm } from '../state/AppContext';
import { fmtDate } from '../utils/date';
import type { IssueSeverity } from '../types';

function severityDot(sev: IssueSeverity) {
  const map: Record<string, string> = { niedrig: 'var(--ink-faint)', mittel: 'var(--amber)', hoch: 'var(--red)' };
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: map[sev] || 'var(--ink-faint)', marginRight: 5 }} />;
}

export function LocationPanel() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const c = state.customers.find((x) => x.id === state.panelLocationId);
  const [newTask, setNewTask] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [newSeverity, setNewSeverity] = useState<IssueSeverity>('mittel');

  if (!c) return null;
  const empCount = state.employees.filter((e) => e.customerIds.includes(c.id)).length;
  const tasks = c.tasks || [];
  const issues = [...(c.issues || [])].sort((a, b) => b.date.localeCompare(a.date));
  const doneCount = tasks.filter((t) => t.done).length;
  const canManage = hasPerm('locations_manage');

  return (
    <Drawer
      title={c.name}
      onClose={() => actions.closeLocationPanel()}
      footer={
        canManage ? (
          <>
            <button className="btn btn-danger" onClick={() => actions.deleteCustomer(c.id)}>
              <Icon name="trash" /> Löschen
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                actions.closeLocationPanel();
                actions.openModal('customer', c);
              }}
            >
              <Icon name="edit" /> Bearbeiten
            </button>
          </>
        ) : (
          <span className="hint">Nur Ansicht – keine Bearbeitungsrechte.</span>
        )
      }
    >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="badge badge-grey">{c.type || '–'}</span>
        <span className="badge badge-green">{c.interval || '–'}</span>
        <span className="badge badge-mint">{c.area || '–'} m²</span>
      </div>
      {c.lat && c.lng ? (
        <iframe
          loading="lazy"
          title="map"
          style={{ width: '100%', height: 150, border: '1px solid var(--line)', borderRadius: 10, marginBottom: 14 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${c.lng - 0.004}%2C${c.lat - 0.0025}%2C${c.lng + 0.004}%2C${c.lat + 0.0025}&layer=mapnik&marker=${c.lat}%2C${c.lng}`}
        />
      ) : null}
      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <span className="dl">Adresse</span>
          <span className="dv">{c.address}</span>
        </div>
        <div>
          <span className="dl">Geofence-Radius</span>
          <span className="dv">{c.radius} m</span>
        </div>
        <div>
          <span className="dl">Geofencing</span>
          <span className="dv">
            {c.geofenceEnabled ? (
              <span className="badge badge-mint">
                <span className="badge-dot" />
                Aktiv
              </span>
            ) : (
              <span className="badge badge-grey">
                <span className="badge-dot" />
                Inaktiv
              </span>
            )}
          </span>
        </div>
        <div>
          <span className="dl">Mitarbeiter zugeordnet</span>
          <span className="dv">{empCount}</span>
        </div>
        <div>
          <span className="dl">Ansprechperson</span>
          <span className="dv">{c.contact || '–'}</span>
        </div>
        <div>
          <span className="dl">Telefon</span>
          <span className="dv">{c.phone || '–'}</span>
        </div>
        <div>
          <span className="dl">Vertragsbeginn</span>
          <span className="dv">{c.contractStart ? fmtDate(new Date(c.contractStart)) : '–'}</span>
        </div>
        <div>
          <span className="dl">Stundenkontingent</span>
          <span className="dv">{c.monthlyHours || 0} h / Monat</span>
        </div>
        <div>
          <span className="dl">Stundensatz</span>
          <span className="dv">CHF {(c.hourlyRate || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13 }}>Zugang & Schlüssel</h3>
        <div className="detail-grid" style={{ marginTop: 8 }}>
          <div>
            <span className="dl">Schlüsselnummer</span>
            <span className="dv mono">{c.keyNumber || '–'}</span>
          </div>
          <div>
            <span className="dl">Zugangscode</span>
            <span className="dv mono">{c.accessCode || '–'}</span>
          </div>
          <div>
            <span className="dl">Zugangszeitfenster</span>
            <span className="dv">{c.accessFrom && c.accessTo ? `${c.accessFrom} – ${c.accessTo} Uhr` : '–'}</span>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <span className="dl">Hinweis</span>
            <span className="dv" style={{ fontWeight: 500 }}>
              {c.accessNotes || '–'}
            </span>
          </div>
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: 16 }}>
        <div className="card-head" style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 13 }}>Leistungsverzeichnis</h3>
          <span className="hint">
            {doneCount}/{tasks.length} erledigt
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {tasks.length ? (
            tasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                <input type="checkbox" checked={t.done} onChange={() => actions.toggleTask(c.id, t.id)} style={{ accentColor: 'var(--primary)' }} />
                <span style={{ flex: 1, fontSize: 12.8, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-faint)' : undefined }}>
                  {t.label}
                </span>
                <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => actions.removeTask(c.id, t.id)}>
                  <Icon name="close" />
                </button>
              </div>
            ))
          ) : (
            <div className="hint">Noch keine Aufgaben hinterlegt.</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            placeholder="Neue Aufgabe, z. B. Teppiche saugen"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                actions.addTask(c.id, newTask);
                setNewTask('');
              }
            }}
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              actions.addTask(c.id, newTask);
              setNewTask('');
            }}
          >
            <Icon name="plus" /> Hinzufügen
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="card-head" style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 13 }}>Mängel & Reklamationen</h3>
          <span className="hint">{issues.filter((i) => i.status !== 'erledigt').length} offen</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {issues.length ? (
            issues.map((i) => (
              <div key={i.id} style={{ border: '1px solid var(--line)', borderRadius: 9, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 12.6 }}>
                    {severityDot(i.severity)}
                    {i.text}
                  </div>
                  <button className="icon-btn" style={{ width: 24, height: 24, flex: 'none' }} onClick={() => actions.removeIssue(c.id, i.id)}>
                    <Icon name="close" />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span className="hint">{fmtDate(new Date(i.date))}</span>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <IssueBadge status={i.status} />
                    {i.status !== 'erledigt' ? (
                      <button
                        className="link-btn"
                        onClick={() => actions.setIssueStatus(c.id, i.id, i.status === 'offen' ? 'in Bearbeitung' : 'erledigt')}
                      >
                        {i.status === 'offen' ? '→ In Bearbeitung' : '→ Erledigt'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="hint">Keine Mängel erfasst.</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            placeholder="Neue Mängelmeldung…"
            value={newIssue}
            onChange={(e) => setNewIssue(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
          />
          <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as IssueSeverity)} style={{ padding: '8px 8px', border: '1px solid var(--line)', borderRadius: 8 }}>
            <option value="niedrig">Niedrig</option>
            <option value="mittel">Mittel</option>
            <option value="hoch">Hoch</option>
          </select>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              actions.addIssue(c.id, newIssue, newSeverity);
              setNewIssue('');
            }}
          >
            <Icon name="plus" />
          </button>
        </div>
      </div>
    </Drawer>
  );
}
