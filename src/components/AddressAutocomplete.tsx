import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './icons/Icon';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';
import type { PlaceDetails, PlacePrediction } from '../types';

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (details: PlaceDetails) => void;
  placeholder?: string;
}) {
  const { status, search, getDetails } = usePlacesAutocomplete();
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const handleInput = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (status !== 'ready' || val.trim().length < 3) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await search(val);
      setLoading(false);
      setPredictions(results);
    }, 300);
  };

  const pick = async (p: PlacePrediction) => {
    setPredictions([]);
    const details = await getDetails(p.placeId);
    if (details) onSelect(details);
  };

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label>Adresse suchen</label>
      <input
        autoComplete="off"
        placeholder={placeholder ?? 'Strasse, PLZ oder Ort eingeben…'}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
      />
      {predictions.length ? (
        <div className="addr-suggest">
          {predictions.map((p) => (
            <div key={p.placeId} className="addr-suggest-item" onClick={() => pick(p)}>
              <Icon name="location" />
              <span>{p.description}</span>
            </div>
          ))}
        </div>
      ) : null}
      {status === 'unconfigured' ? (
        <div className="hint">
          Google Places ist nicht konfiguriert (VITE_GOOGLE_MAPS_API_KEY fehlt). Adresse sowie Breiten-/Längengrad bitte manuell
          eintragen.
        </div>
      ) : status === 'error' ? (
        <div className="hint">Adresssuche konnte nicht geladen werden. Adresse sowie Koordinaten bitte manuell eintragen.</div>
      ) : status === 'loading-sdk' ? (
        <div className="hint">Adresssuche wird geladen…</div>
      ) : loading ? (
        <div className="hint">Suche läuft…</div>
      ) : (
        <div className="hint">Adressvorschläge über Google Places. Auswahl übernimmt Adresse und Koordinaten automatisch.</div>
      )}
    </div>
  );
}
