import React from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { Icon } from '../components/icons/Icon';

export function LocationsPage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canManage = hasPerm('locations_manage');

  return (
    <>
      <div className="toolbar">
        <div className="sub" style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>
          {state.customers.length} Standorte hinterlegt
        </div>
        {canManage ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('customer')}>
            <Icon name="plus" /> Standort / Kunde anlegen
          </button>
        ) : null}
      </div>
      <div className="grid cols-3">
        {state.customers.map((c) => {
          const empCount = state.employees.filter((e) => e.customerIds.includes(c.id)).length;
          const openIssues = (c.issues || []).filter((i) => i.status !== 'erledigt').length;
          return (
            <div key={c.id} className="cust-card" onClick={() => actions.openLocationPanel(c.id)}>
              <div className="top">
                <div>
                  <h4>{c.name}</h4>
                  <div className="addr">{c.address}</div>
                </div>
                {canManage ? (
                  <div
                    style={{ display: 'flex', gap: 6 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="icon-btn" onClick={() => actions.openModal('customer', c)}>
                      <Icon name="edit" />
                    </button>
                    <button className="icon-btn" onClick={() => actions.deleteCustomer(c.id)}>
                      <Icon name="trash" />
                    </button>
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                <span className="badge badge-grey">{c.type || '–'}</span>
                <span className="badge badge-green">{c.interval || '–'}</span>
                {openIssues ? (
                  <span className="badge badge-red">
                    <span className="badge-dot" />
                    {openIssues} offene Mängel
                  </span>
                ) : null}
              </div>
              <div className="radius-tag">
                <Icon name="location" /> Radius {c.radius} m {c.geofenceEnabled ? '· Geofencing aktiv' : '· Geofencing inaktiv'}
              </div>
              <div className="divider" />
              <div style={{ fontSize: 12.3, color: 'var(--ink-soft)' }}>
                Ansprechperson: <b style={{ color: 'var(--ink)' }}>{c.contact || '–'}</b>
              </div>
              <div style={{ fontSize: 12.3, color: 'var(--ink-soft)' }}>{c.phone || ''}</div>
              <div style={{ marginTop: 9, fontSize: 12, color: 'var(--ink-faint)' }}>
                {empCount} Mitarbeiter · {c.area || '–'} m² · {(c.tasks || []).length} Leistungspunkte
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
