import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp, useActingEmployeeId } from '../state/AppContext';
import { eligibleCustomersFor, getService } from '../state/selectors';
import { useGeolocation } from '../hooks/useGeolocation';
import { haversine } from '../utils/geo';
import { isoDate } from '../utils/date';

export function ClockInModal({ payload }: { payload?: { customerId?: string } }) {
  const { state, actions } = useApp();
  const actingId = useActingEmployeeId();
  const emp = state.employees.find((e) => e.id === actingId);

  const pool = eligibleCustomersFor(state, emp);
  const preselected = payload?.customerId;
  const [customerId, setCustomerId] = useState<string>(preselected || pool[0]?.id || '');
  const { status, fix, error, locate } = useGeolocation();

  const todayIso = isoDate(new Date());
  const assignedShift = state.shifts.find((s) => s.employeeId === emp?.id && s.customerId === customerId && s.date === todayIso);
  const autoService = assignedShift?.serviceId ? getService(state, assignedShift.serviceId) : undefined;
  const activeServices = state.services.filter((sv) => sv.active);
  const [manualServiceId, setManualServiceId] = useState('');
  const resolvedServiceId = autoService ? autoService.id : manualServiceId || null;

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!emp) return null;
  const cust = state.customers.find((c) => c.id === customerId);
  const distance = fix && cust ? haversine(fix.lat, fix.lng, cust.lat, cust.lng) : null;
  const geofenceOff = !!cust && !cust.geofenceEnabled;
  const withinRadius = !!cust && (geofenceOff || (distance !== null && distance <= cust.radius));
  // Ist Geofencing für das Objekt deaktiviert, darf ein fehlender/verzögerter GPS-Fix das Einstempeln
  // nicht blockieren – die Standortprüfung entfällt dann komplett.
  const canConfirm = !!cust && (geofenceOff || (status === 'success' && withinRadius));

  let statusBox: React.ReactNode = null;
  if (geofenceOff) {
    statusBox = (
      <div className="hint">Geofencing für diesen Standort ist deaktiviert – Einstempeln ist ohne Standortprüfung möglich.</div>
    );
  } else if (status === 'locating') {
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
    if (withinRadius) {
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
    if (!cust || !canConfirm) return;
    const effectiveFix = fix ?? { lat: 0, lng: 0, accuracy: 0 };
    actions.confirmClockIn(emp.id, cust.id, effectiveFix, distance ?? 0, cust.radius, withinRadius, resolvedServiceId);
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
      {preselected && cust ? (
        <div className="field">
          <label>Reinigungsobjekt</label>
          <div style={{ padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface-alt)', fontWeight: 600 }}>
            {cust.name}
          </div>
        </div>
      ) : (
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
      )}
      {autoService ? (
        <div className="field">
          <label>Leistung</label>
          <div style={{ padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface-alt)', fontWeight: 600 }}>
            {autoService.name}
          </div>
          <div className="hint">Aus dem geplanten Einsatz übernommen.</div>
        </div>
      ) : activeServices.length ? (
        <div className="field">
          <label>Leistung (optional)</label>
          <select value={manualServiceId} onChange={(e) => setManualServiceId(e.target.value)}>
            <option value="">– Keine Leistung –</option>
            {activeServices.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>{statusBox}</div>
      <div className="hint" style={{ marginTop: 10 }}>
        Geofence-Radius für diesen Standort: <b>{cust ? cust.radius : '–'} m</b>
      </div>
    </Modal>
  );
}
