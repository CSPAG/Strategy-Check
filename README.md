# CSP Strategie Selbsteinschätzung

Web-Applikation für Team-Selbsteinschätzungen zur **CSPstrategie 2026+** (Periode H2 2026).

## Funktionen (MVP)

- **Selbsteinschätzung** pro Team (Factsheet, Reifegrad, Portfolio-Matrix, Strategie-Radar, 10 strategische Ziele)
- **Factsheet** mit Drucken/PDF (Browser)
- **GL-Dashboard** mit konsolidierter Matrix und Reifegrad-Heatmap
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

Browser: **http://localhost:3000** — voller Zugriff als Demo-GL (alle Teams + Dashboard).

## Installation mit Keycloak-Login

### 1. Keycloak-Client anlegen

In der [Keycloak Admin Console](https://iam.csp-ag.ai/admin/) (Realm bestätigen, oft nicht `master`):

1. Client erstellen, z. B. Client ID `strategy-check`
2. Client authentication: **ON** (Confidential)
3. Standard flow / Authorization Code: **ON**
4. **Valid redirect URIs:**
   - `http://localhost:3000/api/auth/callback/keycloak`
   - `https://<produktions-host>/api/auth/callback/keycloak`
5. **Valid post logout redirect URIs:** `http://localhost:3000/*` (+ Prod)
6. **Web origins:** `http://localhost:3000` (+ Prod)
7. Client Secret kopieren
8. Scopes: `openid`, `profile`, `email`
9. Rollenclaims im ID-Token/Userinfo aktivieren (siehe [`docs/keycloak-rollen.md`](docs/keycloak-rollen.md))

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
| `DATABASE_URL` | `file:./dev.db` (SQLite) oder SQL Server Connection String |

**Redirect URI in Keycloak:** `https://<ihre-url>/api/auth/callback/keycloak`

## Deployment (CSP-Infrastruktur, ohne Docker)

```bash
npm run build
npm start
```

`next.config.ts` ist auf `output: "standalone"` gesetzt — der Ordner `.next/standalone` kann auf einem Windows-Server mit Node.js betrieben werden (z. B. hinter IIS als Reverse Proxy).

### SQL Server (optional)

In `prisma/schema.prisma` Provider auf `sqlserver` ändern und `DATABASE_URL` setzen, danach `npm run db:push`.

## Benutzer & Teams

- Auth.js verwendet verschlüsselte JWT-Sessions mit acht Stunden Laufzeit; es gibt keinen DB-Session-Store.
- Beim ersten serverseitigen Zugriff wird der Benutzer anhand der stabilen Keycloak-`sub` in der Datenbank angelegt.
- **Rollen:** stammen ausschließlich aus Keycloak-Claims; `gl` wird zu `GL_VIEWER`, `admin` zu `ADMIN`, alle anderen authentifizierten Benutzer zu `TEAM_EDITOR`.
- **Team-Zuordnung:** Feld `teamId` am User (z. B. via Prisma Studio oder SQL), damit Team-Editoren nur ihr Team bearbeiten.

```bash
npx prisma studio
```

## Teams (H2 2026)

19 Teams (10 CIR, 9 Unit) werden mit `npm run db:seed` angelegt.

## Strategie-Bezug

Basiert auf CSPstrategie 2026+ (Zyklus 2026–2028): 4 Schwerpunkte, 6 Radar-Dimensionen, 10 strategische Ziele, Reifegradmodell Stufe 1–5.
