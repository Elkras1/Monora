import React, { useRef, useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { Empty } from './ui/Empty';
import { PasswordField, PasswordStrengthMeter } from './ui/PasswordField';
import { useApp, useCurrentUser, useHasPerm, useIsAdmin } from '../state/AppContext';
import type { CustomFieldDef, CustomFieldType, Employee, EmployeeDocumentType, EmployeeStatus, EmploymentType, SystemRole } from '../types';
import { fmtDate, isoDate } from '../utils/date';
import { uid } from '../utils/format';
import { passwordRequirementsMet } from '../utils/password';
import { sendInvite as sendInviteEmail, type InviteEmail } from '../services/inviteService';
import { deleteDocBlob, getDocBlob, MAX_DOC_SIZE_BYTES, saveDocBlob } from '../utils/docStore';

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

const DOC_TYPES: EmployeeDocumentType[] = [
  'Arbeitsvertrag',
  'Ausweis',
  'Arbeitsbewilligung',
  'AHV-Dokument',
  'Banknachweis',
  'Arztzeugnis',
  'Schulungsnachweis',
  'Sonstiges',
];

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Zahl',
  date: 'Datum',
  boolean: 'Ja/Nein',
  select: 'Auswahl',
};

const TABS = [
  { id: 'general', label: 'Allgemein' },
  { id: 'pay', label: 'Arbeitszeit & Lohn' },
  { id: 'master', label: 'Stammdaten' },
  { id: 'docs', label: 'Dokumente' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function EmployeeModal({ payload }: { payload?: Employee }) {
  const { state, actions, toast } = useApp();
  const isAdmin = useIsAdmin();
  const currentUser = useCurrentUser();
  const hasPermRaw = useHasPerm();
  const hasPerm = (id: string) => isAdmin || hasPermRaw(id);
  const editing = payload ?? null;
  // Live aus dem State lesen statt aus dem beim Öffnen übergebenen Snapshot, damit z. B. neu
  // hochgeladene Dokumente sofort sichtbar sind, ohne den Dialog schliessen zu müssen.
  const live = editing ? state.employees.find((e) => e.id === editing.id) ?? editing : null;

  const [tab, setTab] = useState<TabId>('general');

  const canEditGeneral = editing ? hasPerm('emp_edit') : hasPerm('emp_create');
  const canViewSensitive = isAdmin || hasPerm('emp_view_sensitive');
  const canEditSensitive = isAdmin || hasPerm('emp_edit_sensitive');
  const canManageDocs = isAdmin || hasPerm('emp_docs_manage');
  const canManageFieldDefs = isAdmin || hasPerm('custom_fields_manage');

  // Allgemein
  const [firstName, setFirstName] = useState(editing?.firstName ?? editing?.name.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(editing?.lastName ?? editing?.name.split(' ').slice(1).join(' ') ?? '');
  const [role, setRole] = useState(editing?.role ?? 'Servicefachkraft');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [systemRole, setSystemRole] = useState<SystemRole>(editing?.systemRole ?? 'mitarbeiter');
  const [status, setStatus] = useState<EmployeeStatus>(editing?.status ?? 'aktiv');
  // Zugang (nur beim Anlegen — Passwort danach über "Passwort vergessen" bzw. das eigene Profil ändern)
  const [passwordMode, setPasswordMode] = useState<'invite' | 'admin'>('invite');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [invitePreview, setInvitePreview] = useState<InviteEmail | null>(null);
  const [startDate, setStartDate] = useState(editing?.startDate ?? isoDate(new Date()));
  const [customerIds, setCustomerIds] = useState<string[]>(editing?.customerIds ?? []);
  const [serviceIds, setServiceIds] = useState<string[]>(editing?.serviceIds ?? []);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>(editing?.customFieldValues ?? {});

  // Arbeitszeit & Lohn
  const [employmentType, setEmploymentType] = useState<EmploymentType>(editing?.employmentType ?? 'stundenlohn');
  const [hourlyRate, setHourlyRate] = useState(editing?.hourlyRate ?? 0);
  const [monthlySalary, setMonthlySalary] = useState(editing?.monthlySalary ?? 0);
  const [currency, setCurrency] = useState(editing?.currency ?? 'CHF');
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(editing?.weeklyTargetHours ?? 0);
  const [monthlyTargetHours, setMonthlyTargetHours] = useState(editing?.monthlyTargetHours ?? 0);
  const [workloadPercent, setWorkloadPercent] = useState(editing?.workloadPercent ?? 100);

  // Stammdaten
  const [street, setStreet] = useState(editing?.address?.street ?? '');
  const [houseNumber, setHouseNumber] = useState(editing?.address?.houseNumber ?? '');
  const [zip, setZip] = useState(editing?.address?.zip ?? '');
  const [city, setCity] = useState(editing?.address?.city ?? '');
  const [country, setCountry] = useState(editing?.address?.country ?? 'Schweiz');
  const [ahvNumber, setAhvNumber] = useState(editing?.ahvNumber ?? '');
  const [birthDate, setBirthDate] = useState(editing?.birthDate ?? '');
  const [employmentStart, setEmploymentStart] = useState(editing?.employmentStart ?? '');
  const [probationEnd, setProbationEnd] = useState(editing?.probationEnd ?? '');
  const [contractEnd, setContractEnd] = useState(editing?.contractEnd ?? '');
  const [iban, setIban] = useState(editing?.iban ?? '');
  const [employeeNotes, setEmployeeNotes] = useState(editing?.employeeNotes ?? '');

  // Zusatzfeld-Schema (Anlegen/Bearbeiten)
  const [editingFieldDef, setEditingFieldDef] = useState<CustomFieldDef | null>(null);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  // Dokument-Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDocType, setPendingDocType] = useState<EmployeeDocumentType>('Sonstiges');
  const [pendingNote, setPendingNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const toggleCustomer = (cid: string) => setCustomerIds((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]));
  const toggleService = (sid: string) => setServiceIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
  const setFieldValue = (defId: string, value: string | number | boolean) => setCustomFieldValues((prev) => ({ ...prev, [defId]: value }));

  const resetFieldForm = () => {
    setShowFieldForm(false);
    setEditingFieldDef(null);
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldOptions('');
  };
  const startEditFieldDef = (def: CustomFieldDef) => {
    setEditingFieldDef(def);
    setFieldLabel(def.label);
    setFieldType(def.type);
    setFieldRequired(def.required);
    setFieldOptions((def.options ?? []).join(', '));
    setShowFieldForm(true);
  };
  const saveFieldDef = () => {
    if (!fieldLabel.trim()) {
      toast('Bitte einen Feldnamen angeben.');
      return;
    }
    const options = fieldType === 'select' ? fieldOptions.split(',').map((o) => o.trim()).filter(Boolean) : undefined;
    actions.saveCustomFieldDef({ label: fieldLabel.trim(), type: fieldType, required: fieldRequired, options }, editingFieldDef?.id ?? null);
    resetFieldForm();
  };

  const save = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast('Bitte Vor- und Nachname angeben.');
      return;
    }
    if (!isValidEmail(email)) {
      toast('Bitte eine gültige E-Mail-Adresse angeben.');
      return;
    }
    // Zugang wird nur beim erstmaligen Anlegen festgelegt — beim Bearbeiten bleibt das bestehende
    // Passwort unverändert (siehe saveEmployee: "password" wird nur mitgeschickt, wenn hier gesetzt).
    let initialPassword: string | undefined;
    let effectiveStatus = status;
    if (!editing) {
      if (passwordMode === 'admin') {
        if (!passwordRequirementsMet(password)) {
          toast('Passwort muss mind. 8 Zeichen, einen Buchstaben und eine Zahl enthalten.');
          return;
        }
        if (password !== password2) {
          toast('Die Passwörter stimmen nicht überein.');
          return;
        }
        initialPassword = password;
      } else {
        // Variante B: Mitarbeiter legt das Passwort selbst fest. Für den Prototyp bekommt das Konto ein
        // zufälliges, niemandem bekanntes Platzhalter-Passwort und den Status "eingeladen" — der
        // Mitarbeiter aktiviert sein Konto über "Passwort vergessen" mit seiner E-Mail (siehe LoginPage).
        initialPassword = `${uid()}${uid()}`;
        effectiveStatus = 'eingeladen';
      }
    }
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    actions.saveEmployee(
      {
        name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        status: effectiveStatus,
        email: email.trim(),
        phone,
        systemRole: isAdmin ? systemRole : editing?.systemRole ?? 'mitarbeiter',
        ...(initialPassword ? { password: initialPassword } : {}),
        startDate,
        customerIds,
        serviceIds,
        customFieldValues,
        employmentType,
        hourlyRate,
        monthlySalary,
        currency,
        weeklyTargetHours,
        monthlyTargetHours,
        workloadPercent,
        address: { street, houseNumber, zip, city, country },
        ahvNumber,
        birthDate,
        employmentStart,
        probationEnd,
        contractEnd,
        iban,
        employeeNotes,
      },
      editing?.id ?? null
    );
    if (!editing && passwordMode === 'invite') {
      // Einladungs-E-Mail über den eigenen Invite-Service simulieren (siehe services/inviteService.ts) —
      // Modal bleibt offen, damit der Admin die simulierte E-Mail als Vorschau sieht.
      sendInviteEmail(firstName.trim(), email.trim()).then(setInvitePreview);
      return;
    }
    actions.closeModal();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_DOC_SIZE_BYTES) {
      toast(`Datei zu gross (max. ${Math.round(MAX_DOC_SIZE_BYTES / 1024 / 1024)} MB für diesen Prototyp).`);
      return;
    }
    setPendingFile(file);
  };

  const uploadDocument = async () => {
    if (!live || !pendingFile) return;
    setUploading(true);
    try {
      const docId = uid();
      await saveDocBlob(docId, pendingFile);
      actions.addEmployeeDocument(live.id, {
        id: docId,
        fileName: pendingFile.name,
        docType: pendingDocType,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.name ?? 'Unbekannt',
        note: pendingNote.trim(),
        size: pendingFile.size,
        mimeType: pendingFile.type || 'application/octet-stream',
        storageRef: docId,
      });
      setPendingFile(null);
      setPendingNote('');
      setPendingDocType('Sonstiges');
    } catch {
      toast('Dokument konnte nicht gespeichert werden.');
    } finally {
      setUploading(false);
    }
  };

  const viewDocument = async (storageRef: string) => {
    const blob = await getDocBlob(storageRef);
    if (!blob) {
      toast('Datei nicht gefunden (evtl. in einem anderen Browser hochgeladen).');
      return;
    }
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const downloadDocument = async (storageRef: string, fileName: string) => {
    const blob = await getDocBlob(storageRef);
    if (!blob) {
      toast('Datei nicht gefunden (evtl. in einem anderen Browser hochgeladen).');
      return;
    }
    triggerBlobDownload(blob, fileName);
  };

  const deleteDocument = async (docId: string, storageRef: string) => {
    if (!live || !window.confirm('Dieses Dokument wirklich löschen?')) return;
    await deleteDocBlob(storageRef);
    actions.deleteEmployeeDocument(live.id, docId);
  };

  return (
    <Modal
      title={editing ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter anlegen'}
      onClose={() => actions.closeModal()}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            {invitePreview ? 'Fertig' : 'Schliessen'}
          </button>
          {canEditGeneral && !invitePreview ? (
            <button className="btn btn-primary" onClick={save}>
              <Icon name={!editing && passwordMode === 'invite' ? 'send' : 'check'} />{' '}
              {editing ? 'Speichern' : passwordMode === 'invite' ? 'Einladung senden' : 'Anlegen'}
            </button>
          ) : null}
        </>
      }
    >
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => {
          if (t.id === 'pay' || t.id === 'master') {
            if (!canViewSensitive) return null;
          }
          return (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'general' ? (
        <>
          <div className="field-row">
            <div className="field">
              <label>Vorname</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!canEditGeneral} />
            </div>
            <div className="field">
              <label>Nachname</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!canEditGeneral} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>E-Mail</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEditGeneral} />
            </div>
            <div className="field">
              <label>Telefonnummer (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEditGeneral} />
            </div>
          </div>
          {!editing ? (
            <div className="settings-section" style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: 12, marginBottom: 13 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8 }}>Zugang</label>
              {invitePreview ? (
                <div className="invite-preview">
                  <div className="ok-box" style={{ marginBottom: 10 }}>
                    <Icon name="check" /> Einladung erstellt und E-Mail-Versand simuliert.
                  </div>
                  <div className="invite-preview-mail">
                    <div>
                      <span className="dl">An</span> {invitePreview.to}
                    </div>
                    <div>
                      <span className="dl">Betreff</span> {invitePreview.subject}
                    </div>
                    <pre>{invitePreview.body}</pre>
                  </div>
                  <div className="hint" style={{ marginTop: 8 }}>
                    Prototyp-Hinweis: kein echter E-Mail-Versand — der Mitarbeiter kann sich stattdessen direkt über „Passwort vergessen" mit dieser
                    E-Mail-Adresse ein Passwort setzen.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: passwordMode === 'admin' ? 12 : 0 }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" checked={passwordMode === 'invite'} onChange={() => setPasswordMode('invite')} style={{ marginTop: 3 }} />
                      <span>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          Mitarbeiter soll Passwort selbst festlegen <span className="badge badge-blue">Empfohlen</span>
                        </div>
                        <div className="hint">Es wird eine Einladungs-E-Mail simuliert; der Mitarbeiter setzt sein Passwort beim ersten Anmelden selbst.</div>
                      </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" checked={passwordMode === 'admin'} onChange={() => setPasswordMode('admin')} style={{ marginTop: 3 }} />
                      <span>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Initiales Passwort festlegen</div>
                        <div className="hint">Du vergibst direkt ein Passwort für den ersten Login.</div>
                      </span>
                    </label>
                  </div>
                  {passwordMode === 'admin' ? (
                    <div className="field-row" style={{ marginBottom: 0 }}>
                      <PasswordField label="Initiales Passwort" value={password} onChange={setPassword} autoComplete="new-password" />
                      <PasswordField label="Passwort bestätigen" value={password2} onChange={setPassword2} autoComplete="new-password" />
                    </div>
                  ) : null}
                  {passwordMode === 'admin' ? <PasswordStrengthMeter password={password} /> : null}
                </>
              )}
            </div>
          ) : isAdmin ? (
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => editing && actions.invalidateEmployeePassword(editing.id)}
              >
                <Icon name="bolt" /> Neuen Reset-Link auslösen
              </button>
              <span className="hint" style={{ margin: 0 }}>
                Das aktuelle Passwort wird ungültig — der Mitarbeiter setzt über „Passwort vergessen" ein neues.
              </span>
            </div>
          ) : null}

          <div className="field-row">
            <div className="field">
              <label>Berechtigung / Rolle</label>
              <select value={systemRole} onChange={(e) => setSystemRole(e.target.value as SystemRole)} disabled={!canEditGeneral || !isAdmin}>
                <option value="mitarbeiter">Mitarbeiter / Reinigungskraft</option>
                <option value="manager">Manager</option>
                {isAdmin ? <option value="admin">Admin</option> : null}
              </select>
              {!isAdmin ? <div className="hint">Nur Administratoren können die Berechtigung ändern.</div> : null}
            </div>
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)} disabled={!canEditGeneral}>
                <option value="aktiv">Aktiv</option>
                <option value="eingeladen">Eingeladen</option>
                <option value="inaktiv">Deaktiviert</option>
              </select>
            </div>
          </div>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Jobbezeichnung</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={!canEditGeneral}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Eintrittsdatum</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!canEditGeneral} style={{ maxWidth: 220 }} />
          </div>
          <div className="field">
            <label>Leistungen</label>
            <div className="checks">
              {state.services.map((sv) => (
                <label
                  key={sv.id}
                  className={`chip-check ${serviceIds.includes(sv.id) ? 'on' : ''}`}
                  onClick={() => canEditGeneral && toggleService(sv.id)}
                >
                  {serviceIds.includes(sv.id) ? <Icon name="check" /> : null}
                  {sv.name}
                </label>
              ))}
            </div>
            <div className="hint">Mehrfachauswahl möglich, falls ein Mitarbeiter mehrere Leistungen ausführt.</div>
          </div>
          <div className="field">
            <label>Standort(e) / Kunde(n) / Objekt(e)</label>
            <div className="checks">
              {state.customers.map((c) => (
                <label
                  key={c.id}
                  className={`chip-check ${customerIds.includes(c.id) ? 'on' : ''}`}
                  onClick={() => canEditGeneral && toggleCustomer(c.id)}
                >
                  {customerIds.includes(c.id) ? <Icon name="check" /> : null}
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section" style={{ marginTop: 22 }}>
            <div className="card-head">
              <h3 style={{ fontSize: 13 }}>Eigene Zusatzfelder</h3>
              {canManageFieldDefs ? (
                <button className="muted-link" onClick={() => (showFieldForm ? resetFieldForm() : setShowFieldForm(true))}>
                  <Icon name="plus" /> Eigenes Feld hinzufügen
                </button>
              ) : null}
            </div>
            {showFieldForm ? (
              <div className="card" style={{ marginBottom: 12, background: 'var(--surface-alt)' }}>
                <div className="field-row">
                  <div className="field">
                    <label>Feldname</label>
                    <input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="z. B. Führerausweis vorhanden" />
                  </div>
                  <div className="field">
                    <label>Feldtyp</label>
                    <select value={fieldType} onChange={(e) => setFieldType(e.target.value as CustomFieldType)}>
                      {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                        <option key={t} value={t}>
                          {FIELD_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {fieldType === 'select' ? (
                  <div className="field">
                    <label>Auswahloptionen (mit Komma getrennt)</label>
                    <input value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} placeholder="z. B. S, M, L, XL" />
                  </div>
                ) : null}
                <label className="perm-row" style={{ padding: '4px 2px' }}>
                  <span>Pflichtfeld</span>
                  <span className={`toggle ${fieldRequired ? 'on' : ''}`} onClick={() => setFieldRequired((v) => !v)}>
                    <span className="toggle-knob" />
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveFieldDef}>
                    {editingFieldDef ? 'Speichern' : 'Hinzufügen'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={resetFieldForm}>
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : null}
            {state.customFieldDefs.length ? (
              state.customFieldDefs.map((def) => (
                <div key={def.id} className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ margin: 0 }}>
                      {def.label}
                      {def.required ? ' *' : ''}
                    </label>
                    {canManageFieldDefs ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" onClick={() => startEditFieldDef(def)} title="Bearbeiten">
                          <Icon name="edit" />
                        </button>
                        <button className="icon-btn" onClick={() => actions.deleteCustomFieldDef(def.id)} title="Löschen">
                          <Icon name="trash" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {def.type === 'text' ? (
                    <input
                      value={(customFieldValues[def.id] as string) ?? ''}
                      onChange={(e) => setFieldValue(def.id, e.target.value)}
                      disabled={!canEditGeneral}
                    />
                  ) : def.type === 'number' ? (
                    <input
                      type="number"
                      value={(customFieldValues[def.id] as number) ?? ''}
                      onChange={(e) => setFieldValue(def.id, parseFloat(e.target.value) || 0)}
                      disabled={!canEditGeneral}
                    />
                  ) : def.type === 'date' ? (
                    <input
                      type="date"
                      value={(customFieldValues[def.id] as string) ?? ''}
                      onChange={(e) => setFieldValue(def.id, e.target.value)}
                      disabled={!canEditGeneral}
                    />
                  ) : def.type === 'boolean' ? (
                    <span
                      className={`toggle ${customFieldValues[def.id] ? 'on' : ''}`}
                      onClick={() => canEditGeneral && setFieldValue(def.id, !customFieldValues[def.id])}
                    >
                      <span className="toggle-knob" />
                    </span>
                  ) : (
                    <select
                      value={(customFieldValues[def.id] as string) ?? ''}
                      onChange={(e) => setFieldValue(def.id, e.target.value)}
                      disabled={!canEditGeneral}
                    >
                      <option value="">– wählen –</option>
                      {(def.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))
            ) : (
              <div className="hint">Noch keine Zusatzfelder angelegt.</div>
            )}
          </div>
        </>
      ) : null}

      {tab === 'pay' && canViewSensitive ? (
        <>
          <div className="field">
            <label>Lohnart</label>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)} disabled={!canEditSensitive} style={{ maxWidth: 260 }}>
              <option value="stundenlohn">Stundenlohn</option>
              <option value="monatslohn">Monatslohn</option>
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label>
                Stundenlohn {employmentType !== 'stundenlohn' ? <span className="hint">(Zusatzinfo, nicht massgebend)</span> : null}
              </label>
              <input type="number" min={0} step={0.05} value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} disabled={!canEditSensitive} />
            </div>
            <div className="field">
              <label>
                Monatslohn {employmentType !== 'monatslohn' ? <span className="hint">(Zusatzinfo, nicht massgebend)</span> : null}
              </label>
              <input type="number" min={0} step={10} value={monthlySalary} onChange={(e) => setMonthlySalary(parseFloat(e.target.value) || 0)} disabled={!canEditSensitive} />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Währung</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!canEditSensitive}>
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Soll-Arbeitszeit / Woche (Std.)</label>
              <input type="number" min={0} step={0.5} value={weeklyTargetHours} onChange={(e) => setWeeklyTargetHours(parseFloat(e.target.value) || 0)} disabled={!canEditSensitive} />
            </div>
            <div className="field">
              <label>Soll-Arbeitszeit / Monat (Std.)</label>
              <input type="number" min={0} step={1} value={monthlyTargetHours} onChange={(e) => setMonthlyTargetHours(parseFloat(e.target.value) || 0)} disabled={!canEditSensitive} />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Arbeitspensum (%)</label>
            <input type="number" min={0} max={100} step={5} value={workloadPercent} onChange={(e) => setWorkloadPercent(parseFloat(e.target.value) || 0)} disabled={!canEditSensitive} />
          </div>
          <div className="hint">Es wird keine Lohnabrechnung berechnet — die Werte werden nur gespeichert und angezeigt.</div>
        </>
      ) : null}

      {tab === 'master' && canViewSensitive ? (
        <>
          <div className="field-row">
            <div className="field">
              <label>Strasse</label>
              <input value={street} onChange={(e) => setStreet(e.target.value)} disabled={!canEditSensitive} />
            </div>
            <div className="field">
              <label>Hausnummer</label>
              <input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} disabled={!canEditSensitive} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>PLZ</label>
              <input value={zip} onChange={(e) => setZip(e.target.value)} disabled={!canEditSensitive} />
            </div>
            <div className="field">
              <label>Ort</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} disabled={!canEditSensitive} />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 260 }}>
            <label>Land</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} disabled={!canEditSensitive} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>AHV-Nummer</label>
              <input value={ahvNumber} onChange={(e) => setAhvNumber(e.target.value)} disabled={!canEditSensitive} placeholder="756.XXXX.XXXX.XX" />
            </div>
            <div className="field">
              <label>Geburtsdatum</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} disabled={!canEditSensitive} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Arbeitseintritt</label>
              <input type="date" value={employmentStart} onChange={(e) => setEmploymentStart(e.target.value)} disabled={!canEditSensitive} />
            </div>
            <div className="field">
              <label>Probezeit bis</label>
              <input type="date" value={probationEnd} onChange={(e) => setProbationEnd(e.target.value)} disabled={!canEditSensitive} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Vertragsende</label>
              <input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} disabled={!canEditSensitive} />
            </div>
            <div className="field">
              <label>Bankkonto / IBAN</label>
              <input value={iban} onChange={(e) => setIban(e.target.value)} disabled={!canEditSensitive} placeholder="CHXX XXXX XXXX XXXX XXXX X" />
            </div>
          </div>
          <div className="field">
            <label>Notizen (optional)</label>
            <textarea rows={2} value={employeeNotes} onChange={(e) => setEmployeeNotes(e.target.value)} disabled={!canEditSensitive} />
          </div>
        </>
      ) : null}

      {tab === 'docs' ? (
        live ? (
          <>
            <div className="hint" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" /> Dokumente werden aktuell nur lokal in diesem Browser gespeichert.
            </div>
            {canManageDocs ? (
              <div className="card" style={{ marginBottom: 14, background: 'var(--surface-alt)' }}>
                <div className="field">
                  <label>Neues Dokument hochladen</label>
                  <input ref={fileInputRef} type="file" onChange={onFileSelected} />
                </div>
                {pendingFile ? (
                  <>
                    <div className="field-row">
                      <div className="field">
                        <label>Dokumenttyp</label>
                        <select value={pendingDocType} onChange={(e) => setPendingDocType(e.target.value as EmployeeDocumentType)}>
                          {DOC_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Notiz (optional)</label>
                        <input value={pendingNote} onChange={(e) => setPendingNote(e.target.value)} />
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={uploadDocument} disabled={uploading}>
                      <Icon name="upload" /> {pendingFile.name} hochladen
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
            {(live.documents ?? []).length ? (
              (live.documents ?? []).map((doc) => (
                <div key={doc.id} className="me-shift-row" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Icon name="fileText" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.8 }}>{doc.fileName}</div>
                        <div className="hint">
                          {doc.docType} · {fmtDate(new Date(doc.uploadedAt))} · {(doc.size / 1024).toFixed(0)} KB · von {doc.uploadedBy}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
                      <button className="icon-btn" title="Ansehen" onClick={() => viewDocument(doc.storageRef)}>
                        <Icon name="eye" />
                      </button>
                      <button className="icon-btn" title="Herunterladen" onClick={() => downloadDocument(doc.storageRef, doc.fileName)}>
                        <Icon name="download" />
                      </button>
                      {canManageDocs ? (
                        <button className="icon-btn" title="Löschen" onClick={() => deleteDocument(doc.id, doc.storageRef)}>
                          <Icon name="trash" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {canManageDocs ? (
                    <div className="field-row" style={{ marginBottom: 0 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <select
                          value={doc.docType}
                          onChange={(e) => actions.updateEmployeeDocument(live.id, doc.id, { docType: e.target.value as EmployeeDocumentType })}
                        >
                          {DOC_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <input
                          defaultValue={doc.note}
                          placeholder="Notiz…"
                          onBlur={(e) => {
                            if (e.target.value !== doc.note) actions.updateEmployeeDocument(live.id, doc.id, { note: e.target.value });
                          }}
                        />
                      </div>
                    </div>
                  ) : doc.note ? (
                    <div className="hint">{doc.note}</div>
                  ) : null}
                </div>
              ))
            ) : (
              <Empty icon="fileText" text="Noch keine Dokumente hochgeladen." />
            )}
          </>
        ) : (
          <Empty icon="fileText" text="Bitte zuerst die Grunddaten speichern — danach können Dokumente hochgeladen werden." />
        )
      ) : null}
    </Modal>
  );
}
