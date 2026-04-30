import type { PolicyAction, Principal, Role } from "./types";

const roleActions: Record<Role, readonly PolicyAction[]> = {
  admin: [
    "chat",
    "agent:read",
    "agent:run",
    "file:read",
    "file:write",
    "share:create",
    "share:read",
    "share:delete",
    "export",
    "audit:read",
  ],
  operator: [
    "chat",
    "agent:read",
    "agent:run",
    "file:read",
    "file:write",
    "share:create",
    "share:read",
    "share:delete",
    "export",
  ],
  analyst: ["chat", "agent:read", "agent:run", "file:read", "share:create", "share:read", "export"],
  viewer: ["agent:read", "share:read", "export"],
};

export function can(principal: Principal, action: PolicyAction): boolean {
  return principal.roles.some((role) => roleActions[role]?.includes(action));
}

export function assertCan(principal: Principal, action: PolicyAction): void {
  if (!can(principal, action)) {
    throw Object.assign(new Error("Insufficient privileges"), { status: 403 });
  }
}
