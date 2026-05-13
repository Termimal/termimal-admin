'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/audit-chain — verify the audit_logs hash chain.
 * Click "Verify" → walks the entire chain server-side and reports
 * either "clean" or the first row where the computed hash doesn't
 * match the stored one (tamper indicator).
 */
import { useState } from 'react'
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'
import { HeroCard, Section } from '@/components/admin/PageChrome'

interface Result {
  bad_row_id: string | null; bad_row_at: string | null;
  expected: string | null; actual: string | null; rows_checked: number
}

export default function AuditChainPage() {
  const [busy, setBusy]     = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [ok, setOk]         = useState<boolean | null>(null)

  const verify = async () => {
    setBusy(true); setResult(null); setOk(null)
    const res = await fetch('/api/admin/audit-verify', { method:'POST' })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) { alert(j.error || 'failed'); return }
    setOk(j.ok); setResult(j.result)
  }

  return (
    <div>
      <HeroCard accent={ok === false ? 'red' : 'green'} icon={<ShieldCheck size={28}/>} eyebrow="Security"
        title="Audit log integrity"
        subtitle="Every audit_log row has prev_hash + row_hash. This page walks the chain and detects any tampered or out-of-sequence row. Run weekly."
        metric={{ label: 'Last verify', value: ok === null ? '—' : ok ? 'CLEAN' : 'TAMPERED' }}/>

      <Section accent="acc" title="Run verification">
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={verify}>
          {busy ? <><RefreshCw size={13} className="spin"/> Verifying…</> : 'Verify chain'}
        </button>
        {result && (
          <div style={{ marginTop:14 }}>
            {ok ? (
              <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(63,185,80,0.12)', border:'1px solid rgba(63,185,80,0.3)', color:'var(--green-val)' }}>
                ✓ Chain clean. <strong>{result.rows_checked}</strong> rows verified.
              </div>
            ) : (
              <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.4)', color:'var(--red)' }}>
                <div style={{ fontWeight:700, display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={14}/> TAMPER DETECTED</div>
                <div style={{ fontSize:12, marginTop:6, fontFamily:'monospace' }}>row_id: {result.bad_row_id}</div>
                <div style={{ fontSize:12, fontFamily:'monospace' }}>at: {result.bad_row_at}</div>
                <div style={{ fontSize:11, marginTop:6 }}>expected: {result.expected}</div>
                <div style={{ fontSize:11 }}>actual:   {result.actual}</div>
                <div style={{ fontSize:12, marginTop:8 }}>Rows checked before mismatch: {result.rows_checked}</div>
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}
