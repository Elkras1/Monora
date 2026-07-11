import React from 'react';
import { useApp } from '../state/AppContext';
import { ClockInModal } from './ClockInModal';
import { ClockOutModal } from './ClockOutModal';
import { ShiftModal } from './ShiftModal';
import { EmployeeModal } from './EmployeeModal';
import { AbsenceModal } from './AbsenceModal';
import { CustomerModal } from './CustomerModal';
import { ServiceModal } from './ServiceModal';
import { MeAbsenceModal } from './MeAbsenceModal';
import { MeCorrectionModal } from './MeCorrectionModal';
import { MeProfileModal } from './MeProfileModal';
import { ShiftPanel } from './ShiftPanel';
import { LocationPanel } from './LocationPanel';
import { TimeEntryPanel } from './TimeEntryPanel';
import { LiveStatusPanel } from './LiveStatusPanel';
import { MyShiftPanel } from './MyShiftPanel';

export function GlobalOverlays() {
  const { state } = useApp();
  const modal = state.modal;

  return (
    <>
      {modal?.type === 'clockin' ? <ClockInModal payload={modal.payload} /> : null}
      {modal?.type === 'clockout' ? <ClockOutModal payload={modal.payload} /> : null}
      {modal?.type === 'shift' ? <ShiftModal payload={modal.payload} /> : null}
      {modal?.type === 'employee' ? <EmployeeModal payload={modal.payload} /> : null}
      {modal?.type === 'absence' ? <AbsenceModal /> : null}
      {modal?.type === 'customer' ? <CustomerModal payload={modal.payload} /> : null}
      {modal?.type === 'service' ? <ServiceModal payload={modal.payload} /> : null}
      {modal?.type === 'meAbsence' ? <MeAbsenceModal /> : null}
      {modal?.type === 'meCorrection' ? <MeCorrectionModal payload={modal.payload} /> : null}
      {modal?.type === 'meProfile' ? <MeProfileModal /> : null}

      {state.panelShiftId ? <ShiftPanel /> : null}
      {state.panelLocationId ? <LocationPanel /> : null}
      {state.panelTimeEntryId ? <TimeEntryPanel /> : null}
      {state.panelLiveStatusId ? <LiveStatusPanel /> : null}
      {state.panelMyShiftId ? <MyShiftPanel /> : null}
    </>
  );
}
