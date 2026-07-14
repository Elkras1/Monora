import React from 'react';
import { AppProvider, useApp, useHasPerm, useIsAdmin } from './state/AppContext';
import { AppShell } from './components/layout/AppShell';
import { GlobalOverlays } from './components/GlobalOverlays';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ClockPage } from './pages/ClockPage';
import { ServicesPage } from './pages/ServicesPage';
import { AbsencePage } from './pages/AbsencePage';
import { LocationsPage } from './pages/LocationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { MessagesPage } from './pages/MessagesPage';
import { TicketsPage } from './pages/TicketsPage';
import { MaterialRequestsPage } from './pages/MaterialRequestsPage';
import { TicketCalendarPage } from './pages/TicketCalendarPage';
import { MeStartPage } from './pages/me/MeStartPage';
import { MeSchedulePage } from './pages/me/MeSchedulePage';
import { MeTimePage } from './pages/me/MeTimePage';
import { MeHoursPage } from './pages/me/MeHoursPage';
import { MeAbsencePage } from './pages/me/MeAbsencePage';
import { MeProfilePage } from './pages/me/MeProfilePage';
import { MeMaterialOrderPage } from './pages/me/MeMaterialOrderPage';
import { Empty } from './components/ui/Empty';
import { ToastHost } from './components/ui/Toast';

function ViewRouter() {
  const { state } = useApp();
  const hasPerm = useHasPerm();
  const isAdmin = useIsAdmin();

  switch (state.view) {
    case 'dashboard':
      return <DashboardPage />;
    case 'schedule':
      return hasPerm('schedule_view') ? <SchedulePage /> : <NoAccess />;
    case 'employees':
      return hasPerm('emp_view') ? <EmployeesPage /> : <NoAccess />;
    case 'clock':
      return <ClockPage />;
    case 'services':
      return hasPerm('services_manage') ? <ServicesPage /> : <NoAccess />;
    case 'absence':
      return <AbsencePage />;
    case 'location':
      return hasPerm('locations_view') ? <LocationsPage /> : <NoAccess />;
    case 'reports':
      return hasPerm('reports_view') ? <ReportsPage /> : <NoAccess />;
    case 'settings':
      return isAdmin ? <SettingsPage /> : <NoAccess />;
    case 'permissions':
      return isAdmin ? <PermissionsPage /> : <NoAccess />;
    case 'messages':
      return <MessagesPage />;
    case 'tickets':
      return hasPerm('tickets_view_own') || hasPerm('tickets_view_all') ? <TicketsPage /> : <NoAccess />;
    case 'tickets-tasks':
      return hasPerm('tickets_view_own') || hasPerm('tickets_view_all') ? <TicketsPage fixedType="aufgabe" /> : <NoAccess />;
    case 'tickets-material':
      return hasPerm('material_manage') ? <MaterialRequestsPage /> : <NoAccess />;
    case 'tickets-calendar':
      return hasPerm('tickets_calendar_view') ? <TicketCalendarPage /> : <NoAccess />;
    case 'me-start':
      return <MeStartPage />;
    case 'me-schedule':
      return <MeSchedulePage />;
    case 'me-time':
      return <MeTimePage />;
    case 'me-hours':
      return <MeHoursPage />;
    case 'me-absence':
      return <MeAbsencePage />;
    case 'me-profile':
      return <MeProfilePage />;
    case 'me-material-order':
      return hasPerm('material_request') ? <MeMaterialOrderPage /> : <NoAccess />;
    default:
      return <NoAccess />;
  }
}

function NoAccess() {
  return <Empty icon="settings" text="Kein Zugriff auf diesen Bereich." />;
}

function AppInner() {
  const { state } = useApp();
  if (!state.loggedIn) {
    return (
      <>
        <LoginPage />
        <ToastHost />
      </>
    );
  }
  return (
    <AppShell>
      <ViewRouter />
      <GlobalOverlays />
      <ToastHost />
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
