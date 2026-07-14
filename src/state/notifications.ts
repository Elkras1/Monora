import type { AppData, AppNotification, SystemRole } from '../types';

/**
 * Benachrichtigungs-Selektoren, analog zu state/chat.ts: die "wer sieht was"-Regel bleibt hier gebündelt,
 * damit sie später 1:1 als Supabase-RLS-Policy (targetRole/targetUserId) übernommen werden kann.
 */
export function notificationsFor(data: AppData, role: SystemRole, userId: string | null): AppNotification[] {
  const list =
    role === 'mitarbeiter'
      ? data.notifications.filter((n) => n.targetRole === 'mitarbeiter' && n.targetUserId === userId)
      : data.notifications.filter((n) => n.targetRole === 'admin_manager');
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCountFor(data: AppData, role: SystemRole, userId: string | null): number {
  return notificationsFor(data, role, userId).filter((n) => !n.read).length;
}
