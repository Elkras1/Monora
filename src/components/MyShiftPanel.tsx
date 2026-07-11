import React from 'react';
import { Drawer } from './ui/Overlay';
import { useApp } from '../state/AppContext';
import { getCust, teammatesFor } from '../state/selectors';
import { colorFor, initials } from '../utils/format';
import { fmtDate } from '../utils/date';

/**
 * Einfache, rein lesende Einsatzdetail-Ansicht für die Mitarbeiter-Ansicht „Mein Dienstplan“.
 * Bewusst getrennt vom gemeinsam genutzten ShiftPanel (Admin/Manager), damit dort nichts verändert wird.
 */
export function MyShiftPanel() {
  const { state, actions } = useApp();
  const shift = state.shifts.find((s) => s.id === state.panelMyShiftId);
  if (!shift) return null;

  const c = getCust(state, shift.customerId);
  const team = teammatesFor(state, shift);

  return (
    <Drawer title="Einsatzdetails" onClose={() => actions.closeMyShiftPanel()}>
      <div className="detail-grid">
        <div style={{ gridColumn: '1/-1' }}>
          <span className="dl">Objekt</span>
          <span className="dv">{c ? c.name : '–'}</span>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <span className="dl">Adresse</span>
          <span className="dv">{c ? c.address : '–'}</span>
        </div>
        <div>
          <span className="dl">Datum</span>
          <span className="dv">{fmtDate(new Date(shift.date))}</span>
        </div>
        <div>
          <span className="dl">Pause</span>
          <span className="dv">{shift.pause || 0} Min.</span>
        </div>
        <div>
          <span className="dl">Startzeit</span>
          <span className="dv mono">{shift.start}</span>
        </div>
        <div>
          <span className="dl">Endzeit</span>
          <span className="dv mono">{shift.end}</span>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <span className="dl">Notiz</span>
          <span className="dv">{shift.notes || '–'}</span>
        </div>
      </div>

      <div className="settings-section" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 13 }}>Team</h3>
        {team.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {team.map((e) => (
              <div key={e.id} className="person">
                <div className="avatar" style={{ background: colorFor(e.id) }}>
                  {initials(e.name)}
                </div>
                <div>
                  <div className="name">{e.name}</div>
                  <div className="meta">{e.role}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hint" style={{ marginTop: 8 }}>
            Niemand sonst ist an diesem Tag für dieses Objekt eingeteilt.
          </div>
        )}
      </div>
    </Drawer>
  );
}
