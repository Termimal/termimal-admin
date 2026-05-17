/**
 * Single source of truth for Supabase env at runtime.
 *
 * Why this exists: GitHub Actions builds inline NEXT_PUBLIC_* values
 * via webpack's DefinePlugin at build time. If the GitHub secret is
 * misconfigured (we caught a literal "-" sitting in
 * secrets.NEXT_PUBLIC_SUPABASE_URL on 2026-05-17), webpack inlines
 * that wrong value INTO the bundle. The wrangler.json `vars` block
 * sets the correct value at runtime, but the bundle is already
 * compiled with the bad literal so process.env reads return "-".
 *
 * The fix below validates whatever process.env returns; on anything
 * non-https it falls back to the canonical project URL / anon key.
 * Both values are public anyway (the anon key ships in the browser
 * bundle on every request), so hardcoding the fallback is the same
 * trust level as the wrangler.json `vars` we already commit.
 *
 * If you fork this project: update SUPABASE_PROJECT_URL_FALLBACK and
 * SUPABASE_ANON_KEY_FALLBACK to your own values, or set the GitHub
 * Action secrets correctly and the dynamic read will satisfy first.
 */

const SUPABASE_PROJECT_URL_FALLBACK = 'https://kqmgxnxvmahnvrmizfzr.supabase.co'
const SUPABASE_ANON_KEY_FALLBACK    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbWd4bnh2bWFobnZybWl6ZnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTM0NTcsImV4cCI6MjA5MTc2OTQ1N30.B5g1rrpBTR9J1iLzd5Xzatqa3iGSFPxISDIou3DxwHA'

export function supabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (v && /^https?:\/\//i.test(v) && !v.includes('placeholder') && !v.includes('your-project')) return v
  return SUPABASE_PROJECT_URL_FALLBACK
}

export function supabaseAnonKey(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Validate roughly — JWTs are dot-separated base64. Catches "-" and "".
  if (v && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(v)) return v
  return SUPABASE_ANON_KEY_FALLBACK
}

/** Service-role key is server-only; no public fallback. Always read env. */
export function supabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
}
