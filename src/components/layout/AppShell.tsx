import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TopNav } from './TopNav';
import { MobileTabBar } from './MobileTabBar';
import { useApp } from '../../state/AppContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, actions } = useApp();

  useEffect(() => {
    if (!state.userMenuOpen) return;
    const handler = () => actions.setUserMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [state.userMenuOpen, actions]);

  return (
    <>
      {/* Desktop/Tablet: horizontale Navigation oben (siehe global.css für die Breakpoint-Umschaltung). */}
      <TopNav />
      <div className="app-body">
        {/* Mobile (Admin/Manager): weiterhin die bestehende ausklappbare Sidebar. Auf Desktop per CSS ausgeblendet. */}
        <Sidebar />
        <div className="main">
          {/* Mobile: bestehende Kopfzeile mit Seitentitel + Hamburger-Menü. Auf Desktop per CSS ausgeblendet. */}
          <Topbar />
          <div className="content">{children}</div>
        </div>
      </div>
      <MobileTabBar />
    </>
  );
}
