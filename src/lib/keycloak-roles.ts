export type AppRole = "ADMIN" | "EDITOR" | "VIEWER";

const ROLE_ALIASES: Record<string, AppRole> = {
  // Admin-Rechte vergibt nur das Tool (src/lib/admins.ts); Keycloak-Admins sind hier Editoren.
  admin_ps: "EDITOR",
  admin: "EDITOR",
  "strategy-check-admin": "EDITOR",
  editor_ps: "EDITOR",
  employee: "EDITOR",
  team_editor: "EDITOR",
  "team-editor": "EDITOR",
  "strategy-check-editor": "EDITOR",
  viewer: "VIEWER",
  gl: "VIEWER",
  gl_viewer: "VIEWER",
  "gl-viewer": "VIEWER",
  "strategy-check-gl": "VIEWER",
};

function pushStrings(target: string[], value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.trim()) target.push(entry.trim());
    }
  } else if (typeof value === "string" && value.trim()) {
    target.push(value.trim());
  }
}

export function collectKeycloakRoleNames(
  profile: Record<string, unknown>,
  clientId?: string
): string[] {
  const names: string[] = [];

  pushStrings(names, profile.realm_roles);

  const realmAccess = profile.realm_access as { roles?: unknown } | undefined;
  pushStrings(names, realmAccess?.roles);

  if (clientId) {
    const resourceAccess = profile.resource_access as
      | Record<string, { roles?: unknown }>
      | undefined;
    pushStrings(names, resourceAccess?.[clientId]?.roles);
  }

  return names;
}

export function toAppRoles(roleNames: string[]): AppRole[] {
  const roles = new Set<AppRole>();
  for (const name of roleNames) {
    const role = ROLE_ALIASES[name.trim().toLowerCase()];
    if (role) roles.add(role);
  }
  return normalizeAppRoles([...roles]);
}

export function normalizeAppRoles(roles: AppRole[] | null | undefined): AppRole[] {
  const unique = [...new Set(roles ?? [])];
  return unique.length > 0 ? unique : ["VIEWER"];
}

export function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("EDITOR")) return "EDITOR";
  return "VIEWER";
}

export function canAccessDashboard(role: AppRole | string | undefined): boolean {
  return role === "ADMIN" || role === "EDITOR" || role === "VIEWER";
}

export function canEditAnyAssessment(role: AppRole | string | undefined): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canUnlockSubmitted(role: AppRole | string | undefined): boolean {
  return role === "ADMIN";
}
