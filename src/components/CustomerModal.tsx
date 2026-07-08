import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { AddressAutocomplete } from './AddressAutocomplete';
import { useApp } from '../state/AppContext';
import type { Customer, PlaceDetails } from '../types';
import { isoDate } from '../utils/date';
import { uid } from '../utils/format';

const OBJECT_TYPES = ['Büro', 'Gastronomie', 'Praxis / Klinik', 'Hotel', 'Wohnobjekt', 'Lager / Küche', 'Industrie', 'Aussenanlage', 'Sonstiges'];
const INTERVALS = ['täglich', '2x wöchentlich', 'wöchentlich', '14-täglich', 'monatlich', 'nach Vereinbarung'];
const DEFAULT_TASKS = ['Böden reinigen / wischen', 'Staub wischen', 'Sanitäranlagen reinigen', 'Mülleimer leeren'];
const RADIUS_PRESETS = [50, 100, 150, 250, 500];

export function CustomerModal({ payload }: { payload?: Customer }) {
  const { actions, state, toast } = useApp();
  const editing = payload ?? null;

  const [name, setName] = useState(editing?.name ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [lat, setLat] = useState(editing?.lat ?? 47.3769);
  const [lng, setLng] = useState(editing?.lng ?? 8.5417);
  const [radius, setRadius] = useState(editing?.radius ?? state.settings.defaultRadius ?? 100);
  const [geofenceEnabled, setGeofenceEnabled] = useState(editing?.geofenceEnabled ?? true);
  const [type, setType] = useState(editing?.type ?? 'Büro');
  const [area, setArea] = useState(editing?.area ?? 100);
  const [interval, setInterval_] = useState(editing?.interval ?? 'wöchentlich');
  const [contact, setContact] = useState(editing?.contact ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [contractStart, setContractStart] = useState(editing?.contractStart ?? isoDate(new Date()));
  const [monthlyHours, setMonthlyHours] = useState(editing?.monthlyHours ?? 10);
  const [hourlyRate, setHourlyRate] = useState(editing?.hourlyRate ?? 38);
  const [keyNumber, setKeyNumber] = useState(editing?.keyNumber ?? '');
  const [accessCode, setAccessCode] = useState(editing?.accessCode ?? '');
  const [accessFrom, setAccessFrom] = useState(editing?.accessFrom ?? '');
  const [accessTo, setAccessTo] = useState(editing?.accessTo ?? '');
  const [accessNotes, setAccessNotes] = useState(editing?.accessNotes ?? '');

  const onPlaceSelected = (details: PlaceDetails) => {
    setAddress(details.formattedAddress);
    setLat(details.lat);
    setLng(details.lng);
  };

  const save = () => {
    if (!name.trim()) {
      toast('Bitte einen Namen angeben.');
      return;
    }
    if (!address.trim()) {
      toast('Bitte eine Adresse auswählen oder eingeben.');
      return;
    }
    const data = {
      name,
      address,
      lat,
      lng,
      radius,
      geofenceEnabled,
      contact,
      phone,
      active: true,
      notes: editing?.notes ?? '',
      type,
      area,
      interval,
      keyNumber,
      accessCode,
      accessFrom,
      accessTo,
      accessNotes,
      contractStart,
      monthlyHours,
      hourlyRate,
      tasks: editing?.tasks ?? DEFAULT_TASKS.map((t) => ({ id: uid(), label: t, done: false })),
      issues: editing?.issues ?? [],
    };
    actions.saveCustomer(data, editing?.id ?? null);
    actions.closeModal();
  };

  const hasCoords = !!(lat && lng);

  return (
    <Modal
      title={editing ? 'Standort bearbeiten' : 'Standort / Kunde anlegen'}
      onClose={() => actions.closeModal()}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" /> {editing ? 'Speichern' : 'Anlegen'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Bürozentrum Nord" />
      </div>

      <AddressAutocomplete value={address} onChange={setAddress} onSelect={onPlaceSelected} />

      {hasCoords ? (
        <iframe
          loading="lazy"
          title="map-preview"
          style={{ width: '100%', height: 150, border: '1px solid var(--line)', borderRadius: 10, margin: '4px 0 12px' }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.004}%2C${lat - 0.0025}%2C${lng + 0.004}%2C${lat + 0.0025}&layer=mapnik&marker=${lat}%2C${lng}`}
        />
      ) : null}
      <div className="field-row">
        <div className="field">
          <label>Breitengrad (Lat)</label>
          <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="field">
          <label>Längengrad (Lng)</label>
          <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13 }}>Geofencing</h3>
        <label className="perm-row" style={{ padding: '6px 2px' }}>
          <span>Geofencing für diesen Standort aktiv</span>
          <span className={`toggle ${geofenceEnabled ? 'on' : ''}`} onClick={() => setGeofenceEnabled((v) => !v)}>
            <span className="toggle-knob" />
          </span>
        </label>
        <div className="field" style={{ marginTop: 8 }}>
          <label>Erlaubter Radius (Meter)</label>
          <div className="checks" style={{ marginBottom: 8 }}>
            {RADIUS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`chip-check ${radius === preset ? 'on' : ''}`}
                onClick={() => setRadius(preset)}
              >
                {preset} m
              </button>
            ))}
          </div>
          <input type="number" min={1} value={radius} onChange={(e) => setRadius(parseInt(e.target.value) || 0)} />
          <div className="hint">Voreinstellung wählen oder einen eigenen Meterwert eingeben.</div>
        </div>
      </div>

      <div className="divider" />
      <div className="field-row">
        <div className="field">
          <label>Objekttyp</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {OBJECT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Fläche (m²)</label>
          <input type="number" value={area} onChange={(e) => setArea(parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <div className="field">
        <label>Reinigungsintervall</label>
        <select value={interval} onChange={(e) => setInterval_(e.target.value)}>
          {INTERVALS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="divider" />
      <div className="field-row">
        <div className="field">
          <label>Ansprechperson</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div className="field">
          <label>Telefon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="divider" />
      <div className="field-row">
        <div className="field">
          <label>Vertragsbeginn</label>
          <input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Stundenkontingent / Monat</label>
          <input type="number" step="0.5" value={monthlyHours} onChange={(e) => setMonthlyHours(parseFloat(e.target.value) || 0)} />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Stundensatz (CHF)</label>
        <input type="number" step="0.5" value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="divider" />
      <div className="field-row">
        <div className="field">
          <label>Schlüsselnummer</label>
          <input value={keyNumber} onChange={(e) => setKeyNumber(e.target.value)} />
        </div>
        <div className="field">
          <label>Zugangscode</label>
          <input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Zugang von</label>
          <input type="time" value={accessFrom} onChange={(e) => setAccessFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>Zugang bis</label>
          <input type="time" value={accessTo} onChange={(e) => setAccessTo(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Zugangshinweis</label>
        <textarea
          rows={2}
          placeholder="z. B. Schlüssel bei Empfang, Alarmcode beachten…"
          value={accessNotes}
          onChange={(e) => setAccessNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
