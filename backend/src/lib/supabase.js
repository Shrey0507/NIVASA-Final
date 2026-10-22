/**
 * Supabase client helpers using @supabase/server core primitives.
 *
 * • createContextClient  → RLS-scoped client (uses the caller's JWT)
 * • createAdminClient    → Bypasses RLS (uses the secret key)
 */
import {
  createContextClient,
  createAdminClient,
} from "@supabase/server/core";

/**
 * Build a Supabase client scoped to the authenticated user.
 * Pass the verified `auth` result from verifyAuth / verifyCredentials.
 */
export function getUserClient(auth) {
  return createContextClient({
    auth: { token: auth.token, keyName: auth.keyName },
  });
}

/**
 * Build a Supabase admin client that bypasses RLS.
 */
export function getAdminClient() {
  return createAdminClient();
}
