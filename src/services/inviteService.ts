/**
 * Einladungs-Service (Prototyp): kapselt das Erzeugen des Einladungslinks und der Einladungs-E-Mail für
 * neu angelegte Mitarbeitende, die ihr Passwort selbst festlegen ("Mitarbeiter soll Passwort selbst
 * festlegen" in EmployeeModal). Bewusst NICHT direkt in der UI programmiert, sondern in einem eigenen
 * Modul gekapselt, damit später eine echte Supabase-Auth-Anbindung nur diese eine Datei ersetzen muss.
 *
 * TODO (Supabase Auth): sendInvite() durch einen echten Aufruf ersetzen, z. B.
 *   const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
 *     redirectTo: 'https://app.planico.ch/auth/callback',
 *   });
 * Supabase übernimmt dann sowohl das Erzeugen eines signierten, einmaligen Einladungslinks als auch den
 * tatsächlichen E-Mail-Versand — buildInviteEmail()/INVITE_LINK unten entfallen dann komplett, ebenso
 * das lokale Platzhalter-Passwort in EmployeeModal (Supabase legt das Konto ohne Passwort an, bis der
 * Mitarbeiter dem Link folgt).
 */

export interface InviteEmail {
  to: string;
  subject: string;
  body: string;
}

// TODO (Supabase Auth): durch die von Supabase generierte, signierte Einladungs-URL ersetzen (enthält
// dann ein einmaliges, kontogebundenes Token statt einer statischen Adresse).
export const INVITE_LINK = 'https://app.planico.ch';

/** Baut den Inhalt der Einladungs-E-Mail zusammen — reine, testbare Funktion ohne Seiteneffekte. */
export function buildInviteEmail(firstName: string, email: string): InviteEmail {
  const name = firstName.trim() || 'zusammen';
  return {
    to: email,
    subject: 'Einladung zu Planico',
    body: [
      `Hallo ${name},`,
      '',
      'du wurdest zu Planico eingeladen.',
      '',
      'Klicke auf den folgenden Link, um dein Konto zu aktivieren und dich anzumelden:',
      '',
      INVITE_LINK,
      '',
      'Danach kannst du dich mit deiner E-Mail-Adresse und deinem Passwort anmelden.',
      '',
      'Viele Grüße',
      'Planico',
    ].join('\n'),
  };
}

/**
 * Simuliert den Versand im Prototyp (kein echtes E-Mail-Backend vorhanden) und gibt die zusammengestellte
 * E-Mail zurück, damit die UI sie z. B. als Vorschau anzeigen kann.
 * TODO (Supabase Auth): durch echten Versand ersetzen (siehe Kommentar oben); der Rückgabewert wäre dann
 * nur noch Erfolg/Fehler statt des vollständigen E-Mail-Inhalts.
 */
export async function sendInvite(firstName: string, email: string): Promise<InviteEmail> {
  const mail = buildInviteEmail(firstName, email);
  // Prototyp-Simulation statt echtem Versand — bewusst sichtbar im Log, nicht in Produktionscode verwenden.
  // eslint-disable-next-line no-console
  console.info('[Planico Prototyp] Einladungs-E-Mail simuliert (kein echter Versand):', mail);
  return mail;
}
