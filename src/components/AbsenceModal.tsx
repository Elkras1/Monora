import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { useApp, useHasPerm } from '../state/AppContext';
import type { AbsenceStatus, AbsenceType } from '../types';
import { getAbsencePercentage } from '../state/selectors';
import { isoDate } from '../utils/date';

const QUICK_PERCENTAGES = [25, 50, 75, 100];

function clampPercent(raw: number): number {
  if (!Number.isFinite(raw)) return 100;
  return Math.min(100, Math.max(1, Math.round(raw)));
}

export function AbsenceModal({ payload }: { payload?: { employeeId?: string; date?: string; absenceId?: string } }) {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canSetStatus = hasPerm('absence_approve');
  const editing = payload?.absenceId ? state.absences.find((a) => a.id === payload.absenceId) : undefined;
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? payload?.employeeId ?? state.employees[0]?.id ?? '');
  const [type, setType] = useState<AbsenceType>(editing?.type ?? 'Urlaub');
  const [start, setStart] = useState(editing?.start ?? payload?.date ?? isoDate(new Date()));
  const [end, setEnd] = useState(editing?.end ?? payload?.date ?? isoDate(new Date()));
  const [note, setNote] = useState(editing?.note ?? '');
  const [status, setStatus] = useState<AbsenceStatus>(editing?.status ?? 'beantragt');
  // Ausfallgrad: 1–100 %, Standard 100 % (volle Abwesenheit) — passend für Ferien und die meisten Fälle.
  const [percentage, setPercentage] = useState(editing ? getAbsencePercentage(editing) : 100);

  const save = () => {
    const data = {
      employeeId,
      type,
      start,
      end,
      note,
      status: canSetStatus ? status : ('beantragt' as AbsenceStatus),
      absencePercentage: percentage,
    };
    if (editing) {
      actions.updateAbsence(editing.id, data);
    } else {
      actions.saveAbsence(data);
    }
    actions.closeModal();
  };

  return (
    <Modal
      title={editing ? 'Abwesenheit bearbeiten' : 'Abwesenheit erfassen'}
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            {editing ? 'Änderungen speichern' : 'Antrag erfassen'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Mitarbeiter</label>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {state.employees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Art</label>
        <select value={type} onChange={(e) => setType(e.target.value as AbsenceType)}>
          <option value="Urlaub">Ferien</option>
          <option value="Krankheit">Krankheit</option>
          <option value="Unfall">Unfall</option>
          <option value="Unbezahlt">Unbezahlt</option>
          <option value="Sonstiges">Sonstiges</option>
        </select>
      </div>
      <div className="field">
        <label>Ausfall</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 92 }}>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={percentage}
              onChange={(e) => setPercentage(clampPercent(parseInt(e.target.value, 10)))}
              style={{ width: '100%' }}
            />
            <span className="hint" style={{ fontWeight: 700 }}>
              %
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_PERCENTAGES.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-outline btn-sm ${percentage === p ? 'is-active' : ''}`}
                onClick={() => setPercentage(p)}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          Zu wie viel Prozent ist der Mitarbeiter arbeitsunfähig? Bei Ferien in der Regel 100 %.
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Von</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Bis</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Notiz</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {canSetStatus ? (
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as AbsenceStatus)}>
            <option value="beantragt">Ausstehend</option>
            <option value="genehmigt">Genehmigt</option>
            <option value="abgelehnt">Abgelehnt</option>
          </select>
        </div>
      ) : null}
    </Modal>
  );
}
