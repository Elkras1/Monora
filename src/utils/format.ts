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

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
