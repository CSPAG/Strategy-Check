# Keycloak-URLs für Vercel / Production

Client: `Pako_ko_strat`  
Admin: https://iam.csp-ag.ai/admin/

## Lokal

- Root / Home URL: `http://localhost:3000`
- Valid redirect URIs: `http://localhost:3000/api/auth/callback/keycloak`
- Valid post logout redirect URIs: `http://localhost:3000/*`
- Web origins: `http://localhost:3000`

## Production (Vercel)

Nach dem ersten Deploy die konkrete URL einsetzen (z. B. `https://strategy-check.vercel.app`):

- Root / Home URL: `https://<vercel-host>`
- Valid redirect URIs: `https://<vercel-host>/api/auth/callback/keycloak`
- Valid post logout redirect URIs: `https://<vercel-host>/*`
- Web origins: `https://<vercel-host>`

Preview-Deployments optional zusätzlich:

- `https://*.vercel.app/api/auth/callback/keycloak` (nur wenn Keycloak Wildcard erlaubt)
- oder konkrete Preview-URLs manuell ergänzen

Nach Änderungen am Client: in der App abmelden und neu anmelden.
