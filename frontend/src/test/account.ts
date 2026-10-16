import type { AuthenticatedAdmin } from "@/api/auth"
const ADMIN_ACCOUNT: AuthenticatedAdmin = {
  username: "admin", role: "ADMIN", displayName: "admin",
  requiresPasswordChange: false, workspaceId: null, avatarUrl: null,
}
export { ADMIN_ACCOUNT }
