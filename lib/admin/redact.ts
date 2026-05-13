/**
 * PII redaction helpers for logs.
 *
 * Use these BEFORE writing to any log table (audit_logs, error_logs,
 * email_log meta). The intent is defence-in-depth: even if the table
 * leaks, the contents don't reveal full PII.
 *
 *   - emails:  jordan@example.com  → j****n@example.com
 *   - ips v4:  203.0.113.42        → 203.0.113.x
 *   - ips v6:  2001:db8::1         → 2001:db8::x
 *   - tokens:  bearer 23-char...   → bearer ********
 *   - cards:   4242-4242-4242-4242 → ****-****-****-4242
 *
 * `redactObject(o)` walks a JSON value and applies all of the above
 * to string leaves. Non-string types pass through unchanged.
 *
 * Trade-offs: regex-based. Not bulletproof against creative payloads,
 * but ~99% of accidental PII in logs is one of these five shapes.
 */

const EMAIL_RE   = /([a-z0-9._%+-]{1,64})@([a-z0-9.-]+\.[a-z]{2,})/gi
const IPV4_RE    = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g
const IPV6_RE    = /\b([0-9a-f]{1,4}:[0-9a-f:]+)\b/gi
const BEARER_RE  = /(Bearer\s+)[A-Za-z0-9._-]{16,}/g
const CARD_RE    = /\b(?:\d[ -]?){15,16}\d\b/g

export function redactString(s: string): string {
  if (typeof s !== 'string') return s
  let out = s
  out = out.replace(EMAIL_RE, (_m, local, domain) => {
    const head = local.slice(0, 1)
    const tail = local.length > 2 ? local.slice(-1) : ''
    const middle = local.length > 2 ? '****' : '*'
    return `${head}${middle}${tail}@${domain}`
  })
  out = out.replace(IPV4_RE, (_m, a, b, c) => `${a}.${b}.${c}.x`)
  // IPv6: keep the first two hextet groups
  out = out.replace(IPV6_RE, (m) => {
    if (!m.includes(':')) return m
    const parts = m.split(':')
    if (parts.length < 3) return m
    return `${parts[0]}:${parts[1]}::x`
  })
  out = out.replace(BEARER_RE, '$1********')
  out = out.replace(CARD_RE, (m) => {
    const digits = m.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) return m
    return '****-****-****-' + digits.slice(-4)
  })
  return out
}

export function redactObject<T>(value: T): T {
  if (value == null) return value
  if (typeof value === 'string') return redactString(value) as unknown as T
  if (Array.isArray(value)) return value.map(redactObject) as unknown as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Hard-redact common sensitive keys regardless of content.
      const lk = k.toLowerCase()
      if (lk === 'password' || lk === 'secret' || lk === 'token' || lk === 'authorization' || lk === 'auth' || lk === 'api_key' || lk === 'apikey' || lk === 'private_key') {
        out[k] = '***redacted***'
      } else {
        out[k] = redactObject(v)
      }
    }
    return out as T
  }
  return value
}
