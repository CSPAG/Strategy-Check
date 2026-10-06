# Keycloak-Rollen für Strategy-Check

Die Anwendung liest Rollen ausschließlich aus dem validierten OIDC-Profil
(ID-Token/Userinfo). Lokale Datenbankrollen und E-Mail-Listen entscheiden nicht
über die Session-Berechtigung.

## Unterstützte Rollen

| Keycloak-Slug | App-Rolle | Zugriff |
|---|---|---|
| `admin_ps` | `EDITOR` | Wie `editor_ps`. Admin-Rechte vergibt nicht Keycloak, sondern das Tool (feste Admins in `src/lib/admins.ts`, weitere im Admin-Bereich) |
| `editor_ps` | `EDITOR` | Alle Circles/Teams bearbeiten, Dashboard, Factsheets |
| `viewer` | `VIEWER` | Dashboard + Assessments/Factsheets nur lesen |

Zusätzliche Aliase (Abwärtskompatibilität):

- Admin: `admin`, `strategy-check-admin`
- Editor: `employee`, `team_editor`, `team-editor`, `strategy-check-editor`
- Viewer: `gl`, `gl_viewer`, `gl-viewer`, `strategy-check-gl`

Die Auswertung ist case-insensitive; unbekannte Rollen werden verworfen. Ohne
bekannte App-Rolle gilt ein authentifizierter Benutzer als `VIEWER`.

## Claim-Quellen

Die App unterstützt:

- `realm_roles`
- `realm_access.roles`
- `resource_access.<KEYCLOAK_CLIENT_ID>.roles`

Rollen können deshalb als Realm- oder Client-Rollen geführt werden. Bevorzugt
werden Client-Rollen am Client `Pako_ko_strat`, damit Berechtigungen nicht
versehentlich auf andere Anwendungen wirken.

Falls die Claims im OIDC-Profil fehlen, im Dedicated Client Scope einen
Protocol Mapper für Realm- beziehungsweise Client-Rollen erstellen. Die Claims
müssen im ID-Token und idealerweise in Userinfo enthalten sein.

Nach einer Rollenänderung müssen sich Benutzer ab- und wieder anmelden, da die
Anwendung acht Stunden gültige JWT-Sessions verwendet.

## Benutzer-Provisionierung

Beim ersten serverseitigen Zugriff wird der Benutzer anhand der stabilen
Keycloak-`sub` in der App-Datenbank angelegt. E-Mail dient nur als
Verknüpfungs-Fallback. Das optionale Feld `teamId` ist für den Zugriff nicht
mehr erforderlich (Editoren und Admins bearbeiten alle Circles).
