/**
 * Passwort-Regeln für den Prototyp (mind. 8 Zeichen, mind. 1 Zahl, mind. 1 Buchstabe). Bewusst als
 * eigenständiges Modul, damit dieselbe Regel überall (Mitarbeiter anlegen, Passwort zurücksetzen,
 * Passwort im Profil ändern) verwendet wird — und damit später eine Supabase-Auth-Anbindung diese
 * Client-seitige Prüfung 1:1 übernehmen kann, auch wenn die eigentliche Speicherung/Prüfung dann
 * serverseitig läuft.
 */
export function passwordRequirementsMet(pw: string): boolean {
  return pw.length >= 8 && /[0-9]/.test(pw) && /[a-zA-Z]/.test(pw);
}

export type PasswordStrength = 'leer' | 'schwach' | 'mittel' | 'stark';

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return 'leer';
  if (!passwordRequirementsMet(pw)) return 'schwach';
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score >= 2 ? 'stark' : 'mittel';
}
