# Planico – Zeiterfassung & Facility Workforce

React + TypeScript + Vite Prototyp für Reinigungsfirmen: Dienstplan, Mitarbeiterverwaltung,
Zeiterfassung mit echtem GPS-Geofencing, Abwesenheiten, Standorte/Kunden, Berichte und
Rollen & Berechtigungen (Admin, Manager, Mitarbeiter).

Aktueller Stand: **Mock-Daten im Browser (localStorage)**, keine echte Datenbank, kein Backend,
keine echte Authentifizierung. Google Places wird nur für die Adresssuche bei Standorten genutzt.

## Voraussetzungen

- [Node.js](https://nodejs.org/) Version 18 oder neuer
- npm (wird automatisch mit Node.js installiert)

## 1. Installation

```bash
npm install
```

## 2. Google Maps API-Key einrichten (optional, aber empfohlen)

Ohne Key funktioniert die App vollständig weiter – nur die automatische Adressvorschau beim
Anlegen eines Standorts fehlt dann (Adresse und Koordinaten können jederzeit manuell eingegeben
werden).

1. Datei `.env.example` kopieren und in `.env` umbenennen (im Projekt-Root).
2. In der [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials)
   einen API-Key erstellen und diese beiden APIs dafür aktivieren:
   - **Places API**
   - **Maps JavaScript API**
3. Key in der `.env` eintragen:
   ```
   VITE_GOOGLE_MAPS_API_KEY=dein-echter-key
   ```
4. Empfehlung: den Key in der Google Cloud Console auf HTTP-Referrer beschränken
   (deine Domain(s) + `localhost`).

Die `.env`-Datei wird nicht mit eingecheckt (siehe `.gitignore`).

## 3. Lokale Entwicklung

```bash
npm run dev
```

Öffnet die App unter [http://localhost:5173](http://localhost:5173).

## 4. Produktions-Build

```bash
npm run build
```

Führt zuerst einen TypeScript-Check aus und baut die App danach nach `dist/`.

Zum lokalen Testen des fertigen Builds:

```bash
npm run preview
```

## 5. Deployment auf Vercel

1. Projekt auf GitHub pushen (siehe Abschnitt weiter unten).
2. Auf [vercel.com](https://vercel.com) einloggen → **Add New... → Project**.
3. Das GitHub-Repository auswählen und importieren.
4. Vercel erkennt Vite automatisch – Standardeinstellungen übernehmen:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Unter **Environment Variables** die Variable `VITE_GOOGLE_MAPS_API_KEY` mit deinem echten
   Key eintragen (derselbe Wert wie lokal in `.env`).
6. **Deploy** klicken.

Kein `vercel.json` nötig – die App hat keine eigene Server-Route/Client-Routing, die
zusätzliche Konfiguration erfordert.

## Projektstruktur (kurz)

```
src/
  components/   Wiederverwendbare UI-Bausteine, Modals, Panels
  pages/        Seiten je Rolle/Bereich (inkl. pages/me/* für die Mitarbeiter-Ansicht)
  state/        Globaler App-State (Context), Rollen-/Berechtigungslogik, Navigation
  data/         Mock-/Seed-Daten, Berechtigungs-Standardwerte
  hooks/        Eigene Hooks (Uhrzeit, Geolocation, Places-Autocomplete)
  utils/        Datum, Formatierung, Distanzberechnung
  styles/       Globales Stylesheet
```

## Wichtige Hinweise

- Alle Daten (Mitarbeiter, Kunden, Schichten, Zeiteinträge, …) sind Mock-Daten und werden nur
  lokal im Browser gespeichert (`localStorage`) – kein Server, keine echte Datenbank.
- Login ist eine Simulation (Mitarbeiter + PIN), keine echte Authentifizierung.
- Ohne `VITE_GOOGLE_MAPS_API_KEY` funktioniert alles ausser der Adress-Autovervollständigung.
