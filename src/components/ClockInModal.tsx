import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp, useActingEmployeeId } from '../state/AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { haversine } from '../utils/geo';
import type { Customer } from '../types';

export function ClockInModal() {
  const { state, actions } = useApp();
  const actingId = useActingEmployeeId();
  const emp = state.employees.find((e) => e.id === actingId);

  const pool = useMemo<Customer[]>(() => {
    if (!emp) return [];
    const assigned = state.customers.filter((c) => emp.customerIds.includes(c.id) && c.active);
    return assigned.length ? assigned : state.customers.filter((c) => c.active);
  }, [state.customers, emp]);

  const [customerId, setCustomerId] = useState<string>(pool[0]?.id ?? '');
  const { status, fix, error, locate } = useGeolocation();

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!emp) return null;
  const cust = state.customers.find((c) => c.id === customerId);
  const distance = fix && cust ? haversine(fix.lat, fix.lng, cust.lat, cust.lng) : null;
  const withinRadius = !!cust && (!cust.geofenceEnabled || (distance !== null && distance <= cust.radius));
  const canConfirm = status === 'success' && !!cust && withinRadius;

  let statusBox: React.ReactNode = null;
  if (status === 'locating') {
    statusBox = (
      <div className="sim-box">
        <Icon name="location" /> Standort wird ermittelt…
      </div>
    );
  } else if (status === 'error' && error) {
    statusBox = (
      <div className="warn-box">
        <Icon name="close" /> {error.message}
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={locate}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  } else if (status === 'success' && cust && distance !== null) {
    if (!cust.geofenceEnabled) {
      statusBox = (
        <div className="hint">Geofencing für diesen Standort ist deaktiviert – Einstempeln ist ohne Standortprüfung möglich.</div>
      );
    } else if (withinRadius) {
      statusBox = (
        <div className="ok-box">
          <Icon name="check" /> Du befindest dich innerhalb des erlaubten Bereichs: ca. <b>{Math.round(distance)} m</b> von „
          {cust.name}“ entfernt (Radius {cust.radius} m).
        </div>
      );
    } else {
      statusBox = (
        <div className="warn-box">
          <Icon name="close" /> Du befindest dich außerhalb des erlaubten Bereichs.
          <br />
          Du bist <b>{Math.round(distance)} m</b> vom Einsatzort entfernt. Einstempeln ist nur innerhalb von <b>{cust.radius} m</b>{' '}
          möglich.
        </div>
      );
    }
  }

  const confirm = () => {
    if (!cust || !fix || !canConfirm) return;
    actions.confirmClockIn(emp.id, cust.id, fix, distance ?? 0, cust.radius, withinRadius);
  };

  return (
    <Modal
      title="Einstempeln"
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-accent" onClick={confirm} disabled={!canConfirm}>
            <Icon name="check" /> Jetzt einstempeln
          </button>
        </>
      }
    >
      <div className="field">
        <label>Standort / Kunde</label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {pool.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>{statusBox}</div>
      <div className="hint" style={{ marginTop: 10 }}>
        Geofence-Radius für diesen Standort: <b>{cust ? cust.radius : '–'} m</b>
      </div>
    </Modal>
  );
}
