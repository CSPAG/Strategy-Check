# CSP Strategie Selbsteinschätzung

Web-Applikation für Team-Selbsteinschätzungen zur **CSPstrategie 2026+** (Periode H2 2026).

## Funktionen (MVP)

- **Selbsteinschätzung** pro Team (Factsheet, Reifegrad, Portfolio-Matrix, Strategie-Radar, 10 strategische Ziele)
- **Factsheet** mit Drucken/PDF (Browser)
- **GL-Dashboard** mit konsolidierter Matrix und Reifegrad-Heatmap
- **Microsoft Login** (Entra ID)
- UI auf **Deutsch**

## Voraussetzungen

- Node.js 20+
- Azure App-Registrierung (Entra ID)

## Schnellstart Demo (ohne Login, ohne Azure)

```powershell
cd C:\dev\csp-strategy-assessment
# .env enthält bereits DEMO_MODE=true
npm install
npm run db:setup
npm run dev
```

Browser: **http://localhost:3000** — voller Zugriff als Demo-GL (alle Teams + Dashboard).

## Installation mit Microsoft Login

```bash
cd C:\dev\csp-strategy-assessment
copy .env.example .env
# DEMO_MODE=false setzen und Azure-Werte füllen
npm install
npm run db:setup
npm run dev
```

App: http://localhost:3000

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Client ID der App-Registrierung |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client Secret |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | CSP Tenant ID |
| `AUTH_SECRET` | Zufälliger String (`openssl rand -base64 32`) |
| `AUTH_URL` | Öffentliche URL der App |
| `DATABASE_URL` | `file:./dev.db` (SQLite) oder SQL Server Connection String |
| `GL_EMAILS` | Komma-getrennte E-Mails mit GL-Dashboard-Zugriff |

**Redirect URI in Azure:** `https://<ihre-url>/api/auth/callback/microsoft-entra-id`

## Deployment (CSP-Infrastruktur, ohne Docker)

```bash
npm run build
npm start
```

`next.config.ts` ist auf `output: "standalone"` gesetzt — der Ordner `.next/standalone` kann auf einem Windows-Server mit Node.js betrieben werden (z. B. hinter IIS als Reverse Proxy).

### SQL Server (optional)

In `prisma/schema.prisma` Provider auf `sqlserver` ändern und `DATABASE_URL` setzen, danach `npm run db:push`.

## Benutzer & Teams

- Beim ersten Login wird der Benutzer in der Datenbank angelegt.
- **GL-Zugriff:** E-Mail in `GL_EMAILS` oder Rolle `GL_VIEWER` in der DB.
- **Team-Zuordnung:** Feld `teamId` am User (z. B. via Prisma Studio oder SQL), damit Team-Editoren nur ihr Team bearbeiten.

```bash
npx prisma studio
```

## Teams (H2 2026)

19 Teams (10 CIR, 9 Unit) werden mit `npm run db:seed` angelegt.

## Strategie-Bezug

Basiert auf CSPstrategie 2026+ (Zyklus 2026–2028): 4 Schwerpunkte, 6 Radar-Dimensionen, 10 strategische Ziele, Reifegradmodell Stufe 1–5.
