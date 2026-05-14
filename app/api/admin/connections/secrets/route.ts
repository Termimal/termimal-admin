/**
 * GET /api/admin/connections/secrets?worker=termimal|termimal-admin
 *   → returns the known-secrets manifest joined with which ones are
 *     actually present on the Worker (via Cloudflare API).
 *
 * POST /api/admin/connections/secrets
 *   body: { worker, name, value }
 *   → upserts the secret on the Worker. Cloudflare's PUT is an
 *     idempotent rotate — same call creates or replaces.
 *
 * Both calls require admin auth. The CLOUDFLARE_API_TOKEN never
 * reaches the client; it stays on the admin Worker.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import {
  listWorkerSecrets, setWorkerSecret, KNOWN_SECRETS, WORKERS,
  type WorkerKey,
} from '@/lib/admin/cloudflare'

function parseWorker(w: string | null): WorkerKey | null {
  if (!w) return null
  return (w in WORKERS) ? (w as WorkerKey) : null
}

export async function GET(request: Request) {
  // Reading Worker secret NAMES is a sensitive-but-not-secret op
  // (values never come through this API; CF doesn't expose them).
  // 'system.read' is the closest existing permission.
  const gate = await requireAdmin('system.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const worker = parseWorker(url.searchParams.get('worker'))
  if (!worker) return NextResponse.json({ error: 'worker query param required' }, { status: 400 })

  const listed = await listWorkerSecrets(worker)
  if (listed.ok === false) return NextResponse.json({ error: listed.error }, { status: 502 })

  // Join the canonical manifest (KNOWN_SECRETS) with what's actually
  // configured on the Worker. Anything in `listed` that isn't in the
  // manifest gets included as an "extra" so the operator can clean up
  // legacy keys.
  const manifestNames = new Set(KNOWN_SECRETS[worker].map(s => s.name))
  const actualNames   = new Set(listed.result.map(s => s.name))

  interface Row {
    name: string
    purpose: string
    link: string
    rotateUrl?: string
    configured: boolean
    /** false when the key is on the Worker but isn't in the curated
     *  KNOWN_SECRETS manifest — useful for spotting legacy keys to
     *  prune. */
    known: boolean
  }
  const rows: Row[] = KNOWN_SECRETS[worker].map(s => ({
    name:      s.name,
    purpose:   s.purpose,
    link:      s.link,
    rotateUrl: s.rotateUrl,
    configured: actualNames.has(s.name),
    known:     true,
  }))

  for (const actual of listed.result) {
    if (!manifestNames.has(actual.name)) {
      rows.push({
        name:       actual.name,
        purpose:    '(not in known-manifest)',
        link:       '',
        rotateUrl:  undefined,
        configured: true,
        known:      false,
      })
    }
  }

  return NextResponse.json({
    worker,
    rows,
    summary: {
      total_known:      KNOWN_SECRETS[worker].length,
      configured_known: rows.filter(r => r.known && r.configured).length,
      missing:          rows.filter(r => r.known && !r.configured).map(r => r.name),
      extras:           rows.filter(r => !r.known).map(r => r.name),
    },
  })
}

export async function POST(request: Request) {
  // Rotating Worker secrets from the web UI is the most-trust
  // operation in the panel: this endpoint can overwrite
  // STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, etc. Gate on
  // `roles.write` so it requires super_admin — regular admins keep
  // read-only access via the GET endpoint above.
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as {
    worker?: string; name?: string; value?: string
  } | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const worker = parseWorker(body.worker ?? null)
  if (!worker) return NextResponse.json({ error: 'worker required (termimal | termimal-admin)' }, { status: 400 })
  if (!body.name || !body.value) {
    return NextResponse.json({ error: 'name + value required' }, { status: 400 })
  }
  if (body.value.length < 4) {
    return NextResponse.json({ error: 'value too short to be a real key' }, { status: 400 })
  }

  const setResult = await setWorkerSecret(worker, body.name, body.value)
  if (setResult.ok === false) {
    return NextResponse.json({ error: setResult.error }, { status: 502 })
  }

  // Audit log — name and worker, never the value.
  const sb = serviceClient()
  await sb.from('audit_logs').insert({
    user_id:     gate.user.id,
    action:      'connections.set_secret',
    entity_type: 'worker_secret',
    entity_id:   `${worker}:${body.name}`,
    metadata:    { worker, secret_name: body.name, value_len: body.value.length },
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true, name: body.name, worker })
}
