import React, { useEffect } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp, useActingEmployeeId } from '../state/AppContext';
import { getCust, openEntryFor } from '../state/selectors';
import { useGeolocation } from '../hooks/useGeolocation';
import { haversine } from '../utils/geo';

export function ClockOutModal() {
  const { state, actions } = useApp();
  const actingId = useActingEmployeeId();
  const open = openEntryFor(state, actingId);
  const cust = open ? getCust(state, open.customerId) : undefined;
  const { status, fix, error, locate } = useGeolocation();

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open || !actingId) return null;

  const distance = fix && cust ? haversine(fix.lat, fix.lng, cust.lat, cust.lng) : null;
  const withinRadius = !!cust && (!cust.geofenceEnabled || (distance !== null && distance <= cust.radius));
  const canConfirm = status === 'success' && withinRadius;

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
        <div className="hint">Geofencing für diesen Standort ist deaktiviert – Ausstempeln ist ohne Standortprüfung möglich.</div>
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
          Du bist <b>{Math.round(distance)} m</b> vom Einsatzort entfernt. Ausstempeln ist nur innerhalb von <b>{cust.radius} m</b>{' '}
          möglich.
        </div>
      );
    }
  }

  const confirm = () => {
    if (!fix || !canConfirm) return;
    actions.confirmClockOut(actingId, fix, distance ?? 0);
  };

  return (
    <Modal
      title="Ausstempeln"
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-danger" onClick={confirm} disabled={!canConfirm}>
            <Icon name="close" /> Jetzt ausstempeln
          </button>
        </>
      }
    >
      <div className="hint" style={{ marginBottom: 10 }}>
        Standort: <b>{cust ? cust.name : '–'}</b>
      </div>
      <div>{statusBox}</div>
      <div className="hint" style={{ marginTop: 10 }}>
        Geofence-Radius für diesen Standort: <b>{cust ? cust.radius : '–'} m</b>
      </div>
    </Modal>
  );
}
