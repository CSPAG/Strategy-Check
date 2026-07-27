export type AppRole = "TEAM_EDITOR" | "GL_VIEWER" | "ADMIN";

const ROLE_ALIASES: Record<string, AppRole> = {
  employee: "TEAM_EDITOR",
  team_editor: "TEAM_EDITOR",
  "team-editor": "TEAM_EDITOR",
  "strategy-check-editor": "TEAM_EDITOR",
  gl: "GL_VIEWER",
  gl_viewer: "GL_VIEWER",
  "gl-viewer": "GL_VIEWER",
  "strategy-check-gl": "GL_VIEWER",
  admin: "ADMIN",
  "strategy-check-admin": "ADMIN",
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
  return unique.length > 0 ? unique : ["TEAM_EDITOR"];
}

export function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("GL_VIEWER")) return "GL_VIEWER";
  return "TEAM_EDITOR";
}

export function isGlRole(role: AppRole | string | undefined): boolean {
  return role === "GL_VIEWER" || role === "ADMIN";
}
