import type { AppData, Chat, ChatMessage, Employee } from '../types';
import { getEmp } from './selectors';

/**
 * Chat-specific selectors, kept separate from selectors.ts so the "who may talk to whom" rule and the
 * chat-list/unread computations stay in one place — this is exactly the module boundary that would move
 * to Supabase Row Level Security policies + realtime subscriptions later, without the UI components that
 * call these functions needing to change.
 */

/** Deterministic 1:1 chat id from two employee ids — no random id needed, so a chat can be opened before the first message exists. */
export function makeChatId(idA: string, idB: string): string {
  return [idA, idB].sort().join('__');
}

function shareCustomer(a: Employee, b: Employee): boolean {
  return a.customerIds.some((id) => b.customerIds.includes(id));
}

/** Who this employee is allowed to start/continue a conversation with, per the fixed Admin/Manager/Mitarbeiter chat rules. */
export function allowedPartnersFor(data: AppData, employeeId: string): Employee[] {
  const me = getEmp(data, employeeId);
  if (!me) return [];
  const active = data.employees.filter((e) => e.id !== me.id && e.status !== 'inaktiv');

  if (me.systemRole === 'admin') {
    return active.filter((e) => e.systemRole === 'mitarbeiter');
  }
  if (me.systemRole === 'manager') {
    return active.filter((e) => e.systemRole === 'mitarbeiter' && shareCustomer(me, e));
  }
  // Mitarbeiter: der Admin sowie alle Manager, die mindestens einen gemeinsamen Standort/Kunden betreuen.
  const admin = active.find((e) => e.systemRole === 'admin');
  const managers = active.filter((e) => e.systemRole === 'manager' && shareCustomer(me, e));
  return [admin, ...managers].filter((e): e is Employee => !!e);
}

export interface ChatListEntry {
  chatId: string;
  partner: Employee;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

/** Full chat list for this employee: every allowed partner, enriched with last message + unread count, most recent first. */
export function getChatListFor(data: AppData, employeeId: string): ChatListEntry[] {
  const partners = allowedPartnersFor(data, employeeId);
  const entries = partners.map((partner) => {
    const chatId = makeChatId(employeeId, partner.id);
    const chatMessages = data.messages.filter((m) => m.chatId === chatId);
    const lastMessage = chatMessages.length ? chatMessages.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
    const unreadCount = chatMessages.filter((m) => m.recipientId === employeeId && !m.read).length;
    return { chatId, partner, lastMessage, unreadCount };
  });
  return entries.sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''));
}

/** Total unread messages across all of this employee's chats — used for nav badges. */
export function getUnreadTotalFor(data: AppData, employeeId: string | null | undefined): number {
  if (!employeeId) return 0;
  return data.messages.filter((m) => m.recipientId === employeeId && !m.read).length;
}

export function getMessagesForChat(data: AppData, chatId: string): ChatMessage[] {
  return data.messages.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getChat(data: AppData, chatId: string): Chat | undefined {
  return data.chats.find((c) => c.id === chatId);
}

/** True only if the given employee is actually one of the two chat participants — used before opening/downloading an attachment. */
export function isChatParticipant(data: AppData, chatId: string, employeeId: string): boolean {
  const [a, b] = chatId.split('__');
  return employeeId === a || employeeId === b;
}
