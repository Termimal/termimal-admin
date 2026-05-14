/**
 * Cloudflare API helper — admin-side wrapper for managing Worker
 * secrets, vars, and deployments from inside the admin panel.
 *
 * Auth: CLOUDFLARE_API_TOKEN is a Worker secret we already set on the
 * admin worker (via wrangler secret put). It carries workers_scripts
 * write scope so we can rotate secrets without shelling out to
 * wrangler. The token NEVER reaches the client — every CF API call
 * goes through admin route handlers.
 *
 * Account ID is hardcoded as a Worker var (not a secret — it's the
 * account ID, not a credential) so we don't need a round-trip to
 * discover it.
 *
 * The two workers we manage:
 *   - termimal        (public site)
 *   - termimal-admin  (this back office)
 *
 * Adding a third worker means adding it to the WORKERS map below and
 * the dropdown in the /admin/connections page.
 */

const ACCOUNT_ID = 'f47a7cb3d0e8ed5030b7c73afa93d3cc'

export const WORKERS = {
  termimal:        { label: 'Public site (termimal.com)', name: 'termimal' },
  'termimal-admin':{ label: 'Admin panel (bo.termimal.com)', name: 'termimal-admin' },
} as const

export type WorkerKey = keyof typeof WORKERS

// HeadersInit-compatible record so fetch() type-narrows cleanly.
function headers(): Record<string, string> | null {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) return null
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }
}

export interface CfSecret {
  name: string
  type: 'secret_text' | 'secret_key' | string
}

export interface CfResult<T> {
  ok: true
  result: T
}

export interface CfError {
  ok: false
  error: string
}

/** List all secrets on a Worker. Returns names only — Cloudflare
 *  never exposes secret values via this API (intentional). */
export async function listWorkerSecrets(worker: WorkerKey): Promise<CfResult<CfSecret[]> | CfError> {
  const h = headers()
  if (!h) return { ok: false, error: 'CLOUDFLARE_API_TOKEN not configured' }
  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${worker}/secrets`,
      { headers: h },
    )
    const j = await r.json().catch(() => ({})) as { success?: boolean; result?: CfSecret[]; errors?: Array<{ message: string }> }
    if (!r.ok || !j.success) {
      return { ok: false, error: j.errors?.[0]?.message || `HTTP ${r.status}` }
    }
    return { ok: true, result: j.result ?? [] }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/**
 * Set (create or rotate) a secret on a Worker. Cloudflare's API is
 * upsert-by-default: putting a secret that already exists rotates
 * the value with no audit-visible "delete then create" pair.
 */
export async function setWorkerSecret(worker: WorkerKey, name: string, value: string): Promise<CfResult<{ name: string }> | CfError> {
  const h = headers()
  if (!h) return { ok: false, error: 'CLOUDFLARE_API_TOKEN not configured' }
  if (!name || !value) return { ok: false, error: 'name + value required' }
  // Cloudflare's secret-name rule is the same as env var names.
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
    return { ok: false, error: 'secret name must be SCREAMING_SNAKE_CASE' }
  }
  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${worker}/secrets`,
      {
        method:  'PUT',
        headers: h,
        body:    JSON.stringify({ name, text: value, type: 'secret_text' }),
      },
    )
    const j = await r.json().catch(() => ({})) as { success?: boolean; result?: { name: string }; errors?: Array<{ message: string }> }
    if (!r.ok || !j.success) {
      return { ok: false, error: j.errors?.[0]?.message || `HTTP ${r.status}` }
    }
    return { ok: true, result: j.result ?? { name } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/** Delete a secret. Irreversible — caller must confirm. */
export async function deleteWorkerSecret(worker: WorkerKey, name: string): Promise<CfResult<true> | CfError> {
  const h = headers()
  if (!h) return { ok: false, error: 'CLOUDFLARE_API_TOKEN not configured' }
  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${worker}/secrets/${name}`,
      { method: 'DELETE', headers: h },
    )
    const j = await r.json().catch(() => ({})) as { success?: boolean; errors?: Array<{ message: string }> }
    if (!r.ok || !j.success) {
      return { ok: false, error: j.errors?.[0]?.message || `HTTP ${r.status}` }
    }
    return { ok: true, result: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/**
 * Curated set of secrets per Worker — the panel only manages keys
 * the platform actually uses. Adding a new adapter? Add the secret
 * name here so it shows up in /admin/connections.
 *
 * `purpose` and `link` are surfaced in the UI so the operator knows
 * where to get the value from when rotating.
 */
export interface KnownSecret {
  name: string
  purpose: string
  link: string
  rotateUrl?: string
  /** Optional 'public-by-design' marker (e.g. NEXT_PUBLIC_*). */
  public?: boolean
}

export const KNOWN_SECRETS: Record<WorkerKey, KnownSecret[]> = {
  termimal: [
    { name: 'STRIPE_SECRET_KEY',       purpose: 'Stripe live secret — server-side payments', link: 'https://dashboard.stripe.com/apikeys',                                rotateUrl: 'https://dashboard.stripe.com/apikeys' },
    { name: 'STRIPE_WEBHOOK_SECRET',   purpose: 'Stripe webhook signing secret',              link: 'https://dashboard.stripe.com/webhooks',                              rotateUrl: 'https://dashboard.stripe.com/webhooks' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY',purpose: 'Supabase service-role JWT (bypasses RLS)',  link: 'https://supabase.com/dashboard/project/kqmgxnxvmahnvrmizfzr/settings/api',rotateUrl: 'https://supabase.com/dashboard/project/kqmgxnxvmahnvrmizfzr/settings/api' },
    { name: 'GEMINI_API_KEY',          purpose: 'Google Gemini (primary, /api/chat)',         link: 'https://aistudio.google.com/apikey' },
    { name: 'GEMINI_API_KEY_BACKUP',   purpose: 'Gemini secondary / rotation key',            link: 'https://aistudio.google.com/apikey' },
    { name: 'GROQ_API_KEY',            purpose: 'Groq (Llama 3.x for fast classification)',   link: 'https://console.groq.com/keys' },
    { name: 'GROQ_API_KEY_BACKUP',     purpose: 'Groq secondary / rotation key',              link: 'https://console.groq.com/keys' },
    { name: 'XAI_API_KEY',             purpose: 'xAI / Grok (real-time + X context)',         link: 'https://console.x.ai' },
    { name: 'FRED_API_KEY',            purpose: 'St. Louis Fed FRED — macro data',            link: 'https://fred.stlouisfed.org/docs/api/api_key.html' },
    { name: 'FINNHUB_API_KEY',         purpose: 'Finnhub — earnings calendar + EPS consensus',link: 'https://finnhub.io/dashboard' },
    { name: 'ALPHAVANTAGE_API_KEY',    purpose: 'Alpha Vantage — fallback fundamentals',      link: 'https://www.alphavantage.co/support/#api-key' },
    { name: 'FMP_API_KEY',             purpose: 'Financial Modeling Prep — ratios + history', link: 'https://site.financialmodelingprep.com/developer/docs' },
    { name: 'ETHERSCAN_API_KEY',       purpose: 'Etherscan — ETH on-chain + netflow labels',  link: 'https://etherscan.io/myapikey' },
    { name: 'DUNE_API_KEY',            purpose: 'Dune Analytics — BTC exchange netflow queries',link: 'https://dune.com/settings/api' },
  ],
  'termimal-admin': [
    { name: 'STRIPE_SECRET_KEY',       purpose: 'Stripe (refunds, customer ops from admin)',  link: 'https://dashboard.stripe.com/apikeys' },
    { name: 'STRIPE_WEBHOOK_SECRET',   purpose: 'Stripe webhook signing',                     link: 'https://dashboard.stripe.com/webhooks' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY',purpose: 'Supabase service-role for admin writes',    link: 'https://supabase.com/dashboard/project/kqmgxnxvmahnvrmizfzr/settings/api' },
    { name: 'RESEND_API_KEY',          purpose: 'Resend (transactional email)',               link: 'https://resend.com/api-keys' },
    { name: 'CLOUDFLARE_API_TOKEN',    purpose: 'CF API token (used by this very page)',      link: 'https://dash.cloudflare.com/profile/api-tokens' },
  ],
}
