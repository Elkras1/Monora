import { useCallback, useState } from 'react';

export type GeoErrorCode = 'permission-denied' | 'position-unavailable' | 'timeout' | 'unsupported';

export interface GeoErrorInfo {
  code: GeoErrorCode;
  message: string;
}

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GeoStatus = 'idle' | 'locating' | 'success' | 'error';

/**
 * Requests the device's real GPS position via the browser Geolocation API.
 * No simulation, no manual override — the caller only ever sees what the
 * device actually reports (or a clear, retryable error).
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<GeoErrorInfo | null>(null);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError({ code: 'unsupported', message: 'Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.' });
      return;
    }
    setStatus('locating');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setStatus('success');
      },
      (err) => {
        let info: GeoErrorInfo;
        if (err.code === err.PERMISSION_DENIED) {
          info = { code: 'permission-denied', message: 'Für die Zeiterfassung ist der Standortzugriff erforderlich.' };
        } else if (err.code === err.TIMEOUT) {
          info = { code: 'timeout', message: 'Standortermittlung hat zu lange gedauert. Bitte erneut versuchen.' };
        } else {
          info = { code: 'position-unavailable', message: 'Standort konnte nicht ermittelt werden. Bitte GPS aktivieren und erneut versuchen.' };
        }
        setFix(null);
        setStatus('error');
        setError(info);
      },
      // enableHighAccuracy:false nutzt WLAN-/Mobilfunk-Ortung statt reinem GPS – deutlich schneller
      // und zuverlässiger (v. a. in Gebäuden), und für die üblichen Geofencing-Radien (ab ca. 50 m)
      // präzise genug. Mit reinem High-Accuracy-GPS kam es drinnen oft zu Timeouts, wodurch Start/
      // Stopp nie bestätigt werden konnten.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  return { status, fix, error, locate };
}
