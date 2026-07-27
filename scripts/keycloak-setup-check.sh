#!/usr/bin/env bash
# Checklist: Keycloak-Client für Strategy-Check (iam.csp-ag.ai)
#
# Dieses Skript legt den Client NICHT an (braucht Admin-API-Token).
# Es prüft Issuer/OIDC-Discovery und druckt die Werte für die Admin-Konsole.

set -euo pipefail

ISSUER="${KEYCLOAK_ISSUER:-https://iam.csp-ag.ai/realms/master}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-Pako_ko_strat}"
APP_URL="${AUTH_URL:-http://localhost:3000}"

DISC="${ISSUER}/.well-known/openid-configuration"

echo "==> OIDC Discovery: ${DISC}"
HTTP=$(curl -sS -m 15 -o /tmp/kc-oidc.json -w "%{http_code}" "${DISC}" || true)
if [[ "${HTTP}" != "200" ]]; then
  echo "FEHLER: Discovery fehlgeschlagen (HTTP ${HTTP}). Realm/Issuer prüfen."
  exit 1
fi

python3 - <<'PY'
import json
d = json.load(open("/tmp/kc-oidc.json"))
print("issuer:", d.get("issuer"))
print("authorization_endpoint:", d.get("authorization_endpoint"))
print("token_endpoint:", d.get("token_endpoint"))
print("end_session_endpoint:", d.get("end_session_endpoint"))
PY

echo
echo "==> In Keycloak Admin anlegen / prüfen"
echo "  Client ID:              ${CLIENT_ID}"
echo "  Client authentication:  ON (Confidential)"
echo "  Valid redirect URI:     ${APP_URL}/api/auth/callback/keycloak"
echo "  Post logout redirect:   ${APP_URL}/*"
echo "  Web origin:             ${APP_URL}"
echo "  Scopes:                 openid profile email"
echo
echo "==> .env"
echo "  KEYCLOAK_CLIENT_ID=${CLIENT_ID}"
echo "  KEYCLOAK_CLIENT_SECRET=<aus Keycloak Credentials kopieren>"
echo "  KEYCLOAK_ISSUER=${ISSUER}"
echo "  AUTH_URL=${APP_URL}"
echo "  DEMO_MODE=false"
echo
echo "OK: Issuer erreichbar."
