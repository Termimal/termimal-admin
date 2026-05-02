'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Terminal, Lock, Mail, Eye, EyeOff, Loader } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      window.location.href = '/admin'
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'#060810',padding:16,
      backgroundImage:'radial-gradient(ellipse at 50% 0,rgba(0,229,192,0.07) 0%,transparent 60%)',
    }}>
      <div style={{
        width:'100%',maxWidth:380,background:'#121726',border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:18,padding:32,display:'flex',flexDirection:'column',gap:24,
        boxShadow:'0 32px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Logo */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <div style={{
            width:48,height:48,borderRadius:14,
            background:'linear-gradient(135deg,rgba(0,229,192,0.2),rgba(0,229,192,0.06))',
            border:'1px solid rgba(0,229,192,0.3)',display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 0 24px rgba(0,229,192,0.15)',
          }}>
            <Terminal size={22} style={{color:'#00e5c0'}}/>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#f0f4ff',letterSpacing:'-.4px'}}>Termimal Admin</div>
            <div style={{fontSize:12,color:'rgba(240,244,255,0.4)',marginTop:2}}>Sign in to continue</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <label style={{fontSize:10.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(240,244,255,0.4)'}}>
              Email
            </label>
            <div style={{position:'relative'}}>
              <Mail size={13} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'rgba(240,244,255,0.3)',pointerEvents:'none'}}/>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@termimal.com"
                style={{
                  width:'100%',padding:'9px 11px 9px 32px',background:'#0a0d16',
                  border:`1px solid ${error?'rgba(255,92,107,0.4)':'rgba(255,255,255,0.08)'}`,
                  borderRadius:10,color:'#f0f4ff',fontSize:13,outline:'none',fontFamily:'inherit',
                }}
                onFocus={e => e.target.style.borderColor='rgba(0,229,192,0.4)'}
                onBlur={e => e.target.style.borderColor=error?'rgba(255,92,107,0.4)':'rgba(255,255,255,0.08)'}
              />
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <label style={{fontSize:10.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(240,244,255,0.4)'}}>
              Password
            </label>
            <div style={{position:'relative'}}>
              <Lock size={13} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'rgba(240,244,255,0.3)',pointerEvents:'none'}}/>
              <input
                type={show?'text':'password'} required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width:'100%',padding:'9px 36px 9px 32px',background:'#0a0d16',
                  border:`1px solid ${error?'rgba(255,92,107,0.4)':'rgba(255,255,255,0.08)'}`,
                  borderRadius:10,color:'#f0f4ff',fontSize:13,outline:'none',fontFamily:'inherit',
                }}
                onFocus={e => e.target.style.borderColor='rgba(0,229,192,0.4)'}
                onBlur={e => e.target.style.borderColor=error?'rgba(255,92,107,0.4)':'rgba(255,255,255,0.08)'}
              />
              <button type="button" onClick={() => setShow(s => !s)} style={{
                position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                background:'none',border:'none',cursor:'pointer',color:'rgba(240,244,255,0.35)',padding:2,
              }}>
                {show ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding:'9px 12px',background:'rgba(255,92,107,0.08)',border:'1px solid rgba(255,92,107,0.2)',
              borderRadius:8,fontSize:12,color:'#ff5c6b',display:'flex',alignItems:'center',gap:7,
            }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%',padding:'11px',background:loading?'rgba(0,191,160,0.6)':'#00bfa0',
            border:'none',borderRadius:10,color:'#000',fontSize:13,fontWeight:800,
            cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            gap:8,transition:'all 150ms ease',fontFamily:'inherit',marginTop:4,
            boxShadow:loading?'none':'0 0 20px rgba(0,229,192,0.2)',
          }}>
            {loading ? <><Loader size={14} style={{animation:'spin 1s linear infinite'}}/>Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; }
        input::placeholder { color: rgba(240,244,255,0.2); }
      `}</style>
    </div>
  )
}
