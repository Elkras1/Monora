import type { Service } from '../types';
import { uid } from '../utils/format';

const DEFAULT_SERVICE_NAMES: Array<{ name: string; description?: string }> = [
  { name: 'Unterhaltsreinigung', description: 'Regelmässige Reinigung von Büro- und Wohnräumen' },
  { name: 'Fensterreinigung' },
  { name: 'Rasen mähen' },
  { name: 'Treppenhausreinigung' },
  { name: 'Grundreinigung', description: 'Intensivreinigung, z. B. bei Ein-/Auszug' },
  { name: 'Büroreinigung' },
  { name: 'Winterdienst', description: 'Schneeräumung und Streudienst' },
  { name: 'Spezialreinigung' },
];

/** Fresh set of the demo/default Leistungen (services) with new IDs — used for the initial seed and for migrating older saves that predate this feature. */
export function makeDefaultServices(): Service[] {
  return DEFAULT_SERVICE_NAMES.map((s) => ({ id: uid(), name: s.name, description: s.description ?? '', active: true }));
}
