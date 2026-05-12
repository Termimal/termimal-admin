/**
 * /api/admin/cron/tick — single cron endpoint.
 *
 * Hits this URL periodically (Cloudflare cron triggers, GitHub Actions
 * schedule, anything that can curl) and we run a small batch of
 * housekeeping jobs:
 *
 *   - Recompute customer_health snapshots          (daily)
 *   - Drain the social_post queue                  (every 5 min)
 *
 * Authentication via the X-Cron-Secret header. Set CRON_SECRET in
 * Worker env to a long random string; matching senders are accepted,
 * everyone else gets 401.
 *
 * Job results are returned as JSON so cron logs show what happened.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { recomputeAllHealth } from '@/lib/admin/health-score'

async function drainSocialQueue(): Promise<{ posted: number; failed: number }> {
  const sb = serviceClient()
  // Pick admin_items category='social_post' that are due (status='in_progress'
  // with a due_date in the past, or no due_date but explicitly enqueued).
  const { data: due } = await sb.from('admin_items')
    .select('id, title, description, tags, due_date')
    .eq('category', 'social_post')
    .eq('status', 'in_progress')
    .is('archived_at', null)
    .lte('due_date', new Date().toISOString())
    .limit(50) as { data: Array<{ id: string; title: string; description: string | null; tags: string[]; due_date: string | null }> | null }
  if (!due?.length) return { posted: 0, failed: 0 }

  let posted = 0, failed = 0
  for (const it of due) {
    const text = it.description || it.title
    // tags hold the platform list e.g. ['x','linkedin']
    const platforms = (it.tags ?? []).filter(t => ['x','linkedin','threads','facebook','instagram'].includes(t))
    let allOk = true
    for (const platform of platforms) {
      try {
        // Re-issue through the post endpoint — auto-refreshes the token if needed.
        const base = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://bo.termimal.com'
        const res = await fetch(`${base}/api/admin/marketing/social/post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Service-role-bypass header — our route doesn't accept this, so
            // posting from here actually requires JWT. For now we log failure;
            // a follow-up will make /post accept an internal token.
            'X-Cron-Secret': process.env.CRON_SECRET || '',
          },
          body: JSON.stringify({ platform, text }),
        })
        if (!res.ok) { allOk = false; failed++ } else { posted++ }
      } catch { allOk = false; failed++ }
    }
    // Mark done regardless — we don't infinitely retry.
    await sb.from('admin_items').update({ status: allOk ? 'done' : 'blocked' }).eq('id', it.id)
  }
  return { posted, failed }
}

export async function GET(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Both jobs in parallel — they're independent.
  const [health, social] = await Promise.allSettled([
    recomputeAllHealth(),
    drainSocialQueue(),
  ])

  const sb = serviceClient()
  const result = {
    health: health.status === 'fulfilled' ? health.value : { error: String(health.reason) },
    social: social.status === 'fulfilled' ? social.value : { error: String(social.reason) },
    ran_at: new Date().toISOString(),
  }
  await sb.from('audit_logs').insert({
    user_id: null, action: 'cron.tick', entity_type: 'system', entity_id: 'cron',
    metadata: result,
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true, ...result })
}
