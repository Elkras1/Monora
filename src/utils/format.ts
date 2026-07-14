import type { Material, MaterialRequestItem } from '../types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const AVA_COLORS = ['#155EEF', '#DB9B0C', '#2A6FA8', '#B85C9E', '#C24A3B', '#4C8C4A', '#7A5FBA'];

export function colorFor(id: string): string {
  const sum = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVA_COLORS[Math.abs(sum) % AVA_COLORS.length];
}

/** Löst den Anzeigenamen einer Bestellposition auf: freier Name ("Anderer Artikel") oder Verweis auf die zentrale Artikelliste. */
export function materialItemName(item: MaterialRequestItem, materials: Material[]): string {
  if (item.customMaterialName) return item.customMaterialName;
  const found = materials.find((m) => m.id === item.materialId);
  return found ? found.name : 'Unbekannter Artikel';
}

/** Kurze, lesbare Zusammenfassung der Positionen einer Materialbestellung, z. B. "4× WC-Papier, 2× Müllsäcke". */
export function summarizeMaterialItems(items: MaterialRequestItem[], materials: Material[], max = 90): string {
  if (!items.length) return '–';
  const text = items.map((i) => `${i.quantity}× ${materialItemName(i, materials)}`).join(', ');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
