export const dynamic = 'force-dynamic'

'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Terminal, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: authErr } = await sb.auth.signInWithPassword({ email, password })
      if (authErr) { setError(authErr.message); setLoading(false); return }
      router.push('/admin')
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Failed')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'var(--acc-bg)',
            border: '1px solid var(--acc-border)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Terminal size={22} style={{ color: 'var(--acc)' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>Termimal Admin</h1>
          <p style={{ fontSize: 13, color: 'var(--t4)' }}>Sign in to your admin account</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 28,
        }}>
          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)',
              color: 'var(--red)', borderRadius: 8, padding: '10px 14px',
              fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@termimal.com"
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--t1)', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{
                  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 40px 10px 12px', color: 'var(--t1)', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4,
                }}>
                {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{
              width: '100%', background: 'var(--acc2)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14,
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
