'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/experiments/[key] — single-experiment results view.
 *
 * Pulls /api/admin/experiments/[key]/results. Shows variant table
 * with conversion rate, 95% Wilson CI, and a tag indicating whether
 * the variant is significantly beating the largest-N "control".
 */
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Beaker, RefreshCw, TrendingUp, TrendingDown, Equal } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  variant: string; exposures: number; conversions: number;
  conv_rate: number; ci_lower: number; ci_upper: number; total_value: number;
  is_control: boolean; sig: 'positive' | 'negative' | 'inconclusive' | null
}

export default function ExperimentResultsPage() {
  const params = useParams<{ key: string }>()
  const key = params.key
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/experiments/${key}/results`, { cache: 'no-store' })
    const j = await r.json()
    setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [key])  // eslint-disable-line react-hooks/exhaustive-deps

  const totalExp = rows.reduce((s, r) => s + r.exposures, 0)
  const winner = rows.find(r => r.sig === 'positive')

  return (
    <div>
      <HeroCard accent="purple" icon={<Beaker size={28}/>} eyebrow="Experimentation"
        title={key}
        subtitle="Variant conversion rates with 95% Wilson confidence intervals. Largest-N variant is treated as control; positive ⇒ a variant's CI lower bound exceeds control's point estimate."
        metric={{
          label: 'Total exposures', value: totalExp.toLocaleString(),
          secondary: winner ? `🏆 ${winner.variant} winning` : `${rows.length} variants`,
        }}/>

      <Section accent="purple" title="Variants" description={loading ? 'Loading…' : `${rows.length} variants`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<Beaker size={20}/>} title="No events yet" description="Drop /api/feature-event-style writes from the dashboard with kind=exposure and kind=conversion to populate this view."/>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'var(--bg3)', textAlign:'left' }}>
              <th style={{ padding:'10px 12px' }}>Variant</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>Exposures</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>Conv</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>Rate</th>
              <th style={{ padding:'10px 12px' }}>95% CI</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>Total $</th>
              <th style={{ padding:'10px 12px' }}>vs control</th>
            </tr></thead>
            <tbody>{rows.map(r => {
              const Icon = r.sig === 'positive' ? TrendingUp : r.sig === 'negative' ? TrendingDown : Equal
              const color = r.sig === 'positive' ? 'var(--green-val)' : r.sig === 'negative' ? 'var(--red)' : 'var(--t4)'
              return (
                <tr key={r.variant} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px 12px', fontWeight:600 }}>
                    {r.variant} {r.is_control && <span style={{ marginLeft:6, padding:'1px 6px', borderRadius:6, background:'var(--bg3)', fontSize:10, color:'var(--t4)' }}>control</span>}
                  </td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace' }}>{r.exposures.toLocaleString()}</td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace' }}>{r.conversions.toLocaleString()}</td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700 }}>{r.conv_rate}%</td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', color:'var(--t3)' }}>{r.ci_lower}% – {r.ci_upper}%</td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace' }}>${r.total_value.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                  <td style={{ padding:'10px 12px' }}>
                    {r.is_control ? <span style={{ color:'var(--t4)' }}>—</span> : (
                      <span style={{ color, display:'inline-flex', alignItems:'center', gap:4, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', fontSize:10 }}>
                        <Icon size={11}/> {r.sig}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
