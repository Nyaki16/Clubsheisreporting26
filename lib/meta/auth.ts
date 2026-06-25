// Re-exported from the central signed-session helper so every call site verifies
// the HMAC signature instead of trusting a forgeable cookie value.
export { authorizeForSlug } from "@/lib/auth";
export type { AuthResult } from "@/lib/auth";
