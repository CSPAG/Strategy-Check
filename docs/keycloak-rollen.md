# Keycloak-Rollen für Strategy-Check

Die Anwendung liest Rollen ausschließlich aus dem validierten OIDC-Profil
(ID-Token/Userinfo). Lokale Datenbankrollen und E-Mail-Listen entscheiden nicht
über die Session-Berechtigung.

## Unterstützte Rollen

| Keycloak-Slug | App-Rolle | Zugriff |
|---|---|---|
| kein App-Slug, `employee`, `team_editor` | `TEAM_EDITOR` | Zugewiesenes Team |
| `gl`, `gl_viewer` | `GL_VIEWER` | Alle Teams und GL-Dashboard |
| `admin` | `ADMIN` | Alle Teams und GL-Dashboard |

Zusätzlich werden die Client-Rollen `strategy-check-editor`,
`strategy-check-gl` und `strategy-check-admin` akzeptiert. Die Auswertung ist
case-insensitive; unbekannte Rollen werden verworfen. Ohne bekannte App-Rolle
gilt ein authentifizierter Benutzer als `TEAM_EDITOR`.

## Claim-Quellen

Die App unterstützt:

- `realm_roles`
- `realm_access.roles`
- `resource_access.<KEYCLOAK_CLIENT_ID>.roles`

Rollen können deshalb als Realm- oder Client-Rollen geführt werden. Bevorzugt
werden Client-Rollen am Client `strategy-check`, damit Berechtigungen nicht
versehentlich auf andere Anwendungen wirken.

Falls die Claims im OIDC-Profil fehlen, im Dedicated Client Scope einen
Protocol Mapper für Realm- beziehungsweise Client-Rollen erstellen. Die Claims
müssen im ID-Token und idealerweise in Userinfo enthalten sein.

Nach einer Rollenänderung müssen sich Benutzer ab- und wieder anmelden, da die
Anwendung acht Stunden gültige JWT-Sessions verwendet.

## Benutzer- und Team-Zuordnung

Beim ersten serverseitigen Zugriff wird der Benutzer anhand der stabilen
Keycloak-`sub` in der App-Datenbank angelegt. E-Mail dient nur als
Verknüpfungs-Fallback. Die fachliche `teamId` bleibt lokal und kann mit
`npx prisma studio` gepflegt werden.
