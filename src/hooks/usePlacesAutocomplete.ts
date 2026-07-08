import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaceDetails, PlacePrediction } from '../types';
import { isGoogleMapsConfigured, loadGoogleMaps } from '../utils/googleMaps';

export type PlacesStatus = 'unconfigured' | 'loading-sdk' | 'ready' | 'error';

/**
 * Thin wrapper around the Google Places Autocomplete + Place Details services.
 * Requires VITE_GOOGLE_MAPS_API_KEY (see .env.example) — without it, `status`
 * stays 'unconfigured' and callers should fall back to manual address entry.
 */
export function usePlacesAutocomplete() {
  const [status, setStatus] = useState<PlacesStatus>(isGoogleMapsConfigured() ? 'loading-sdk' : 'unconfigured');
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setStatus('unconfigured');
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled) return;
        autocompleteService.current = new g.maps.places.AutocompleteService();
        placesService.current = new g.maps.places.PlacesService(document.createElement('div'));
        sessionToken.current = new g.maps.places.AutocompleteSessionToken();
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const search = useCallback(
    (query: string): Promise<PlacePrediction[]> => {
      if (status !== 'ready' || !autocompleteService.current || !query.trim()) return Promise.resolve([]);
      return new Promise((resolve) => {
        autocompleteService.current!.getPlacePredictions(
          { input: query, sessionToken: sessionToken.current ?? undefined },
          (predictions, requestStatus) => {
            if (requestStatus !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
              resolve([]);
              return;
            }
            resolve(predictions.map((p) => ({ placeId: p.place_id, description: p.description })));
          }
        );
      });
    },
    [status]
  );

  const getDetails = useCallback((placeId: string): Promise<PlaceDetails | null> => {
    if (!placesService.current) return Promise.resolve(null);
    return new Promise((resolve) => {
      placesService.current!.getDetails(
        { placeId, fields: ['formatted_address', 'geometry'], sessionToken: sessionToken.current ?? undefined },
        (place, requestStatus) => {
          if (requestStatus !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
            resolve(null);
            return;
          }
          resolve({
            formattedAddress: place.formatted_address ?? '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
          sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        }
      );
    });
  }, []);

  return { status, search, getDetails };
}
