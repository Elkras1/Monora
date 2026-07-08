import React from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { useClock } from '../hooks/useClock';
import { colorFor, initials } from '../utils/format';
import { fmtTime } from '../utils/date';

function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
}

export function LiveStatusPanel() {
  const { state, actions } = useApp();
  const now = useClock();
  const entry = state.timeEntries.find((t) => t.id === state.panelLiveStatusId);
  if (!entry) return null;

  const e = getEmp(state, entry.employeeId);
  const c = getCust(state, entry.customerId);
  const clockIn = new Date(entry.clockIn);
  const onPause = !!entry.pauseStart;
  const workedMs = now.getTime() - clockIn.getTime() - entry.pauseMinutes * 60000 - (onPause ? now.getTime() - new Date(entry.pauseStart as string).getTime() : 0);

  return (
    <Drawer title="Live-Status" onClose={() => actions.closeLiveStatusPanel()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        {e ? (
          <div className="avatar" style={{ background: colorFor(e.id), width: 40, height: 40, fontSize: 14 }}>
            {initials(e.name)}
          </div>
        ) : (
          <div className="avatar" style={{ background: 'var(--ink-faint)', width: 40, height: 40 }}>
            ?
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{e?.name ?? '–'}</div>
          <div className="hint">{e?.role ?? '–'}</div>
        </div>
      </div>
      <div className="detail-grid">
        <div style={{ gridColumn: '1/-1' }}>
          <span className="dl">Reinigungsobjekt</span>
          <span className="dv">{c ? c.name : '–'}</span>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <span className="dl">Adresse</span>
          <span className="dv">{c ? c.address : '–'}</span>
        </div>
        <div>
          <span className="dl">Eingestempelt seit</span>
          <span className="dv mono">{fmtTime(clockIn)}</span>
        </div>
        <div>
          <span className="dl">Aktuelle Arbeitsdauer</span>
          <span className="dv">{formatDuration(workedMs)}</span>
        </div>
        <div>
          <span className="dl">Status</span>
          <span className="dv">
            {onPause ? (
              <span className="badge badge-amber">
                <span className="badge-dot" />
                Pause
              </span>
            ) : (
              <span className="badge badge-mint">
                <span className="badge-dot" />
                Arbeitet
              </span>
            )}
          </span>
        </div>
        {onPause ? (
          <div>
            <span className="dl">Pause seit</span>
            <span className="dv mono">{fmtTime(new Date(entry.pauseStart as string))}</span>
          </div>
        ) : null}
        <div>
          <span className="dl">Letzter Standortstatus</span>
          <span className="dv">
            {entry.geofenceOk ? (
              <span className="badge badge-mint">
                <span className="badge-dot" />
                Vor Ort
              </span>
            ) : (
              <span className="badge badge-amber">
                <span className="badge-dot" />
                Abweichung
              </span>
            )}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <button
          className="btn btn-outline"
          onClick={() => {
            actions.closeLiveStatusPanel();
            actions.openTimeEntryPanel(entry.id);
          }}
        >
          <Icon name="edit" /> Zum Zeiteintrag
        </button>
      </div>
    </Drawer>
  );
}
