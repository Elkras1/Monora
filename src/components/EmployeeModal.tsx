import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp, useIsAdmin } from '../state/AppContext';
import type { Employee, EmployeeStatus, SystemRole } from '../types';
import { isoDate } from '../utils/date';

const ROLE_OPTIONS = [
  'Küchenchef',
  'Koch',
  'Chef de Rang',
  'Servicefachkraft',
  'Barkeeper',
  'Empfangsmitarbeiterin',
  'Housekeeping',
  'Teamleitung',
  'Admin',
];

export function EmployeeModal({ payload }: { payload?: Employee }) {
  const { actions, state, toast } = useApp();
  const isAdmin = useIsAdmin();
  const editing = payload ?? null;

  const [name, setName] = useState(editing?.name ?? '');
  const [role, setRole] = useState(editing?.role ?? 'Servicefachkraft');
  const [status, setStatus] = useState<EmployeeStatus>(editing?.status ?? 'aktiv');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [systemRole, setSystemRole] = useState<SystemRole>(editing?.systemRole ?? 'mitarbeiter');
  const [pin, setPin] = useState(editing?.pin ?? String(Math.floor(1000 + Math.random() * 8999)));
  const [startDate, setStartDate] = useState(editing?.startDate ?? isoDate(new Date()));
  const [customerIds, setCustomerIds] = useState<string[]>(editing?.customerIds ?? []);

  const toggleCustomer = (cid: string) => {
    setCustomerIds((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]));
  };

  const save = () => {
    if (!name.trim()) {
      toast('Bitte einen Namen angeben.');
      return;
    }
    actions.saveEmployee(
      {
        name,
        role,
        status,
        email,
        phone,
        systemRole: isAdmin ? systemRole : editing?.systemRole ?? 'mitarbeiter',
        pin,
        startDate,
        customerIds,
      },
      editing?.id ?? null
    );
    actions.closeModal();
  };

  return (
    <Modal
      title={editing ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter anlegen'}
      onClose={() => actions.closeModal()}
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Rolle</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)}>
            <option value="aktiv">Aktiv</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>E-Mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Telefon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      {isAdmin ? (
        <div className="field">
          <label>Systemrolle</label>
          <select value={systemRole} onChange={(e) => setSystemRole(e.target.value as SystemRole)}>
            <option value="mitarbeiter">Mitarbeiter</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrator</option>
          </select>
          <div className="hint">Bestimmt Navigation und Berechtigungen in der App. Nur für Administratoren sichtbar.</div>
        </div>
      ) : null}
      <div className="field-row">
        <div className="field">
          <label>PIN (Zeiterfassung)</label>
          <input value={pin} onChange={(e) => setPin(e.target.value)} />
        </div>
        <div className="field">
          <label>Eintrittsdatum</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Verknüpfte Standorte / Kunden</label>
        <div className="checks">
          {state.customers.map((c) => (
            <label
              key={c.id}
              className={`chip-check ${customerIds.includes(c.id) ? 'on' : ''}`}
              onClick={() => toggleCustomer(c.id)}
            >
              {customerIds.includes(c.id) ? <Icon name="check" /> : null}
              {c.name}
            </label>
          ))}
        </div>
        <div className="hint">Auswählen, um diesen Mitarbeiter mit Einsatzorten zu verknüpfen.</div>
      </div>
    </Modal>
  );
}
