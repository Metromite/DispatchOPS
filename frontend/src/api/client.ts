/**
 * Small UI-session helpers retained for components that still ask about a
 * local application role. DispatchOPS has no separate application server;
 * operational data access lives in src/services and goes directly to Supabase.
 */

export function getRole(): string | null {
  return "admin";
}

export function logout(): void {
  // No application-server session is stored.
}

export function isAuthEnabled(): boolean {
  return false;
}
