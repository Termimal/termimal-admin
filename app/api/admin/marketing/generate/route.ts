/**
 * /api/admin/marketing/generate — AI post generation for Social Studio.
 *
 * Generates `n` (default 3) variations of a social-media post for a
 * given prompt + target platform. If `OPENAI_API_KEY` is set, calls
 * OpenAI's Responses API; otherwise falls back to deterministic
 * canned variations so the UI always has something to render in dev.
 *
 * Security:
 *   - cookie-bound Supabase client → must be authenticated.
 *   - prompt is capped to 800 chars to limit token cost.
 *   - 3 calls/min/admin via simple in-memory bucket (not perfect across
 *     workers, but good enough until we add a KV-backed limiter).
 */
// NOTE: stays on the default node runtime — opennextjs-cloudflare's
// build doesn't allow mixing edge + node functions in one bundle.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ReqBody {
  prompt:    string
  platform?: 'x' | 'twitter' | 'instagram' | 'linkedin' | 'threads' | 'facebook'
  tone?:     'professional' | 'casual' | 'witty' | 'data-driven'
  count?:    number
}

const PLATFORM_LIMITS: Record<string, number> = {
  x: 280, twitter: 280,
  instagram: 2200, threads: 500, linkedin: 3000, facebook: 63206,
}

const cooldown = new Map<string, number>()

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    // Per-actor rate limit: 3 generations per 60s window.
    const now = Date.now()
    const last = cooldown.get(user.id) || 0
    if (now - last < 20_000) {
      return NextResponse.json({ error: 'rate-limited — wait 20 s' }, { status: 429 })
    }
    cooldown.set(user.id, now)

    const body = await request.json().catch(() => null) as ReqBody | null
    if (!body || !body.prompt || body.prompt.length > 800) {
      return NextResponse.json({ error: 'prompt required (≤800 chars)' }, { status: 400 })
    }

    const platform = body.platform || 'x'
    const charLimit = PLATFORM_LIMITS[platform] ?? 280
    const tone     = body.tone || 'witty'
    const n        = Math.min(Math.max(body.count ?? 3, 1), 5)

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      const sys = `You are Termimal's social media manager. Termimal is a market-analysis terminal for retail traders — clean charts, indicators, news, no broker. Write ${n} ${tone} ${platform} post variations for the user's prompt. Stay under ${charLimit} chars. No hashtag spam (max 2). Return ONLY a JSON array of strings, no commentary.`

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model:           'gpt-4o-mini',
          temperature:     0.85,
          max_tokens:      900,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: sys },
            { role: 'user',   content: `Topic: ${body.prompt}\n\nReturn JSON: { "variants": ["…", "…", "…"] }` },
          ],
        }),
      })
      const aiJson = await aiRes.json()
      if (!aiRes.ok) {
        return NextResponse.json({ error: aiJson.error?.message || 'openai error' }, { status: 500 })
      }
      let variants: string[] = []
      try {
        const parsed = JSON.parse(aiJson.choices[0].message.content)
        variants = Array.isArray(parsed.variants) ? parsed.variants : []
      } catch {
        variants = []
      }
      return NextResponse.json({ variants, source: 'openai' })
    }

    // Fallback — canned variations using the prompt as a seed. Lets
    // the UI work end-to-end without a paid API key, useful in dev
    // and during the integration phase.
    const seedTopic = body.prompt.slice(0, 60).replace(/[\n\r]+/g, ' ').trim()
    const variants = [
      `📈 ${seedTopic} — here's the chart on Termimal. (clean indicators, no broker noise) → termimal.com`,
      `Spent the morning on ${seedTopic}. The setup is on Termimal — you can follow along live: termimal.com`,
      `Hot take: ${seedTopic}. We pulled it apart on Termimal — every indicator, every catalyst, on one screen. termimal.com`,
    ].slice(0, n)
    return NextResponse.json({ variants, source: 'mock', note: 'OPENAI_API_KEY not set — returning canned variations' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
