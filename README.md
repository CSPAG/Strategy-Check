# CSP Strategie Selbsteinschätzung

Web-Applikation für Team-Selbsteinschätzungen zur **CSPstrategie 2026+** (Periode H2 2026).

## Funktionen (MVP)

- **Selbsteinschätzung** pro Team (Factsheet, Reifegrad, Portfolio-Matrix, Strategie-Radar, 10 strategische Ziele)
- **Factsheet** mit Drucken/PDF (Browser)
- **Dashboard** mit konsolidierter Matrix und Reifegrad-Heatmap
- **CSP-Login** über Keycloak (`iam.csp-ag.ai`)
- UI auf **Deutsch**

## Voraussetzungen

- Node.js 20+
- Keycloak-Client in `https://iam.csp-ag.ai` (siehe unten)

## Schnellstart Demo (ohne Login, ohne Keycloak)

```bash
cd Strategy-Check
# .env mit DEMO_MODE=true
npm install
npm run db:setup
npm run dev
```

Browser: **http://localhost:3000** — voller Zugriff als Demo-Admin (alle Teams + Dashboard).

## Installation mit Keycloak-Login

### 1. Keycloak-Client anlegen

In der [Keycloak Admin Console](https://iam.csp-ag.ai/admin/) (Realm bestätigen, oft nicht `master`):

1. Client erstellen, z. B. Client ID `Pako_ko_strat`
2. Client authentication: **ON** (Confidential)
3. Standard flow / Authorization Code: **ON**
4. **Valid redirect URIs:**
   - `http://localhost:3000/api/auth/callback/keycloak`
   - `https://<produktions-host>/api/auth/callback/keycloak`
5. **Valid post logout redirect URIs:** `http://localhost:3000/*` (+ Prod)
6. **Web origins:** `http://localhost:3000` (+ Prod)
7. Client Secret kopieren
8. Scopes: `openid`, `profile`, `email`
9. Client-Rollen anlegen und zuweisen: `admin_ps`, `editor_ps`, `viewer` (siehe [`docs/keycloak-rollen.md`](docs/keycloak-rollen.md))
10. Rollenclaims im ID-Token/Userinfo aktivieren

Issuer-URL: `https://iam.csp-ag.ai/realms/<REALM>`

### 2. App starten

```bash
cp .env.example .env
# DEMO_MODE=false und Keycloak-Werte setzen
npm install
npm run db:setup
npm run dev
```

App: http://localhost:3000

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `DEMO_MODE` | `true` = Login umgehen (nur lokal) |
| `KEYCLOAK_CLIENT_ID` | Keycloak Client ID |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak Client Secret |
| `KEYCLOAK_ISSUER` | Volle Issuer-URL, z. B. `https://iam.csp-ag.ai/realms/master` |
| `AUTH_SECRET` | Zufälliger String (`openssl rand -base64 32`) |
| `AUTH_URL` | Öffentliche URL der App |
| `AUTH_DEBUG` | Optional: Auth.js-Debuglogs aktivieren |
| `DATABASE_URL` | Postgres-Connection-String (Neon), inkl. `?sslmode=require` |

**Redirect URI in Keycloak:** `https://<ihre-url>/api/auth/callback/keycloak`

## Deployment auf Vercel

1. Repo mit Vercel verbinden (`vercel link` / GitHub-Integration).
2. Neon-Postgres anlegen und `DATABASE_URL` setzen.
3. Env-Variablen in Vercel (Production + Preview) setzen: `DEMO_MODE`, Keycloak, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `DATABASE_URL`.
4. Schema & Seed einmalig:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
5. In Keycloak Redirect/Web-Origins um die Vercel-URL ergänzen.
6. Deploy: Push auf `main` oder `vercel --prod`.

Lokale SQLite-Datei (`prisma/dev.db`) wird nicht mehr verwendet.
## E-Mail-Versand (Erinnerungen)

Erinnerungen gehen direkt aus dem Tool (Admin → Erinnerungen): pro Team eine eigene E-Mail an die
hinterlegte Kontaktadresse. «Testmail an mich» prüft die Konfiguration.

**Microsoft 365 / Graph (empfohlen):**
1. Absender-Postfach anlegen, z. B. Shared Mailbox `strategie-check@csp-ag.ch`.
2. Entra ID → App-Registrierungen → Neue Registrierung «Strategie-Check Mail» (nur dieser Mandant).
3. API-Berechtigungen → Microsoft Graph → **Anwendungsberechtigung** `Mail.Send` → Administratorzustimmung erteilen.
4. Zertifikate & Geheimnisse → neuen geheimen Clientschlüssel erstellen.
5. Empfohlen: Mit einer Exchange *Application Access Policy* die App auf das Absender-Postfach beschränken.
6. In Vercel setzen: `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MAIL_FROM`, dann neu deployen.

**SMTP (Alternative):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

## Benutzer & Teams

- Auth.js verwendet verschlüsselte JWT-Sessions mit acht Stunden Laufzeit; es gibt keinen DB-Session-Store.
- Beim ersten serverseitigen Zugriff wird der Benutzer anhand der stabilen Keycloak-`sub` in der Datenbank angelegt.
- **Rollen:** `editor_ps` (und `admin_ps`) → `EDITOR` (alle Circles + Dashboard), `viewer` → `VIEWER` (Dashboard + nur lesen). Ohne bekannte Rolle: `VIEWER`.
- **Admins** vergibt nur das Tool: feste Admins in `src/lib/admins.ts`, weitere werden im Admin-Bereich ernannt (Tabelle `AdminGrant`). Für alle anderen ist `/admin` nicht sichtbar (404).
- **Team-Zuordnung:** optional (`teamId`); für die Berechtigung nicht mehr nötig.

```bash
npx prisma studio
```

## Teams (H2 2026)

19 Teams (10 CIR, 9 Unit) werden mit `npm run db:seed` angelegt.

## Strategie-Bezug

Basiert auf CSPstrategie 2026+ (Zyklus 2026–2028): 4 Schwerpunkte, 6 Radar-Dimensionen, 10 strategische Ziele, Reifegradmodell Stufe 1–5.
