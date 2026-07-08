import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
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
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">{children}</div>
      </div>
      <MobileTabBar />
    </>
  );
}
