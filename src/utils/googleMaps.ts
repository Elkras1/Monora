/**
 * Loads the Google Maps JavaScript API (with the Places library) on demand.
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY to be set (see .env.example). No key is ever
 * hard-coded here — without one, isGoogleMapsConfigured() returns false and callers
 * are expected to show a clear message instead of silently failing.
 */

const SCRIPT_ID = 'google-maps-script';

let loadPromise: Promise<typeof google> | null = null;

export function isGoogleMapsConfigured(): boolean {
  return !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (loadPromise) return loadPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return Promise.reject(new Error('missing-api-key'));
  }

  loadPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { google?: typeof google };
    if (w.google?.maps?.places) {
      resolve(w.google);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as unknown as { google: typeof google }).google));
      existing.addEventListener('error', () => reject(new Error('script-load-error')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as unknown as { google: typeof google }).google);
    script.onerror = () => reject(new Error('script-load-error'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
