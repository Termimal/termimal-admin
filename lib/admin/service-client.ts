/**
 * Service-role Supabase client used inside admin API routes.
 *
 * Centralised so every /api/admin/* handler shares the same setup
 * and we can audit "who has the service-role key" by grepping a
 * single import.
 *
 * Routes that import this MUST already be gated by middleware (which
 * enforces an authenticated admin/super_admin session). The
 * service-role key bypasses RLS — we only use it once that gate has
 * confirmed the caller's identity.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// We don't have generated DB types yet — keep the client loosely-typed
// so admin routes don't fight the compiler. Once `supabase gen types` is
// wired into CI we can swap `any` for the generated `Database` type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = SupabaseClient<any, 'public', any>

let _client: LooseClient | null = null

export function serviceClient(): LooseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client = createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return _client
}
