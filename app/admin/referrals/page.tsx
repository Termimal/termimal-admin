'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users2, CheckCircle, XCircle, DollarSign, Clock, Award } from 'lucide-react'
import { PageHeader, Section, EmptyState, Tabs } from '@/components/admin/PageChrome'

type Status = 'pending' | 'converted' | 'rewarded' | 'rejected'

interface ProfileLite { id: string; email: string; full_name: string | null }
interface ReferralRow {
  id:            string
  referrer_id:   string
  referred_id:   string
  status:        Status
  reward_amount: number
  created_at:    string
  referrer:      ProfileLite | null
  referred:      ProfileLite | null
}
interface Stats {
  pending:        number
  converted:      number
  rewarded:       number
  rejected:       number
  total_paid_out: number
  pending_owed:   number
}

const STATUS_META: Record<Status, { label: string; color: string; chip: string }> = {
  pending:   { label: 'Pending',   color: 'var(--t4)',    chip: 'chip' },
  converted: { label: 'Converted', color: 'var(--blue)',  chip: 'chip chip-blue' },
  rewarded:  { label: 'Rewarded',  color: 'var(--green)', chip: 'chip chip-green' },
  rejected:  { label: 'Rejected',  color: 'var(--red)',   chip: 'chip chip-red' },
}

const NEXT_TRANSITIONS: Record<Status, Status[]> = {
  pending:   ['converted', 'rejected'],
  converted: ['rewarded',  'rejected'],
  rewarded:  [],
  rejected:  [],
}

export default function ReferralsPage() {
  const [rows, setRows]       = useState<ReferralRow[]>([])
  const [stats, setStats]     = useState<Stats | null>(null)
  const [tab, setTab]         = useState<'all' | Status>('pending')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/referrals${tab !== 'all' ? `?status=${tab}` : ''}`, { cache: 'no-store' })
    const j   = await res.json() as { rows?: ReferralRow[]; stats?: Stats }
    setRows(j.rows || [])
    setStats(j.stats || null)
    setLoading(false)
  }, [tab])
  useEffect(() => { load() }, [load])

  async function transition(id: string, next: Status, currentAmount: number) {
    setBusy(id)
    const customAmt = editAmount[id]
    const reward_amount = customAmt && !isNaN(parseFloat(customAmt)) ? parseFloat(customAmt) : currentAmount
    const res = await fetch('/api/admin/referrals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next, reward_amount }),
    })
    const j = await res.json()
    setBusy(null)
    if (!res.ok) {
      alert(j.error || 'failed')
      return
    }
    setEditAmount(prev => { const c = { ...prev }; delete c[id]; return c })
    load()
  }

  const items = useMemo(() => ([
    { key: 'pending',   label: 'Pending',   count: stats?.pending   ?? 0 },
    { key: 'converted', label: 'Converted', count: stats?.converted ?? 0 },
    { key: 'rewarded',  label: 'Rewarded',  count: stats?.rewarded  ?? 0 },
    { key: 'rejected',  label: 'Rejected',  count: stats?.rejected  ?? 0 },
    { key: 'all',       label: 'All',       count: (stats?.pending ?? 0) + (stats?.converted ?? 0) + (stats?.rewarded ?? 0) + (stats?.rejected ?? 0) },
  ]), [stats])

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Users2 size={14} />}
        eyebrow="Finance"
        title="Referral payouts"
        description="Approve or reject referral conversions, set the reward amount, and mark them as paid out. Pay-out itself happens out-of-band (Stripe credit, coupon, transfer); status here is the audit trail."
        accent="green"
      />

      <Section flush accent="green">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1, background: 'var(--border)' }}>
          {[
            { label: 'Pending review',  value: stats?.pending  ?? 0, icon: <Clock size={14}/>,    color: 'var(--t3)'    },
            { label: 'Converted (owed)', value: stats?.converted ?? 0, sub: stats ? `$${stats.pending_owed.toFixed(2)}` : '', icon: <DollarSign size={14}/>, color: 'var(--blue)' },
            { label: 'Rewarded',        value: stats?.rewarded ?? 0, sub: stats ? `$${stats.total_paid_out.toFixed(2)}` : '', icon: <Award size={14}/>,      color: 'var(--green)' },
            { label: 'Rejected',        value: stats?.rejected ?? 0, icon: <XCircle size={14}/>,  color: 'var(--red)'   },
          ].map((c, i) => (
            <div key={i} style={{ background: 'var(--bg2)', padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ color: c.color }}>{c.icon}</span> {c.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {c.value}
              </div>
              {c.sub && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, fontFamily: 'ui-monospace, Menlo, monospace' }}>{c.sub}</div>}
            </div>
          ))}
        </div>
      </Section>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <Tabs items={items} active={tab} onChange={k => setTab(k as 'all' | Status)} accent="green" />
      </div>

      {loading ? (
        <div style={{ padding: 24, fontSize: 13, color: 'var(--t4)' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users2 size={20}/>} title={`No ${tab === 'all' ? '' : tab} referrals`} description={tab === 'pending' ? 'When a new signup uses a referral code, the event lands here for your approval.' : 'Switch tabs to view other statuses.'} />
      ) : (
        <Section flush>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {rows.map(r => {
              const m = STATUS_META[r.status]
              const allowed = NEXT_TRANSITIONS[r.status]
              return (
                <li key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={m.chip}>{m.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5 }}>
                        <strong>{r.referrer?.full_name || r.referrer?.email || r.referrer_id.slice(0, 8) + '…'}</strong>
                        <span style={{ color: 'var(--t4)', margin: '0 6px' }}>→</span>
                        <strong>{r.referred?.full_name || r.referred?.email || r.referred_id.slice(0, 8) + '…'}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        {r.referrer?.email} → {r.referred?.email}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, color: 'var(--t4)' }}>Reward $</label>
                      <input
                        className="input"
                        type="number" step="0.01" min="0"
                        style={{ width: 100, fontFamily: 'ui-monospace, Menlo, monospace' }}
                        defaultValue={r.reward_amount}
                        disabled={r.status === 'rewarded' || r.status === 'rejected'}
                        onChange={e => setEditAmount(prev => ({ ...prev, [r.id]: e.target.value }))}
                      />
                    </div>

                    {allowed.length > 0 && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {allowed.map(next => (
                          <button
                            key={next}
                            type="button"
                            disabled={busy === r.id}
                            onClick={() => transition(r.id, next, r.reward_amount)}
                            className="btn btn-sm"
                            style={{
                              background:
                                next === 'converted' ? 'var(--blue-bg)'   :
                                next === 'rewarded'  ? 'var(--green-bg)' :
                                next === 'rejected'  ? 'var(--red-bg)'   :
                                'var(--surface)',
                              color:
                                next === 'converted' ? 'var(--blue)'  :
                                next === 'rewarded'  ? 'var(--green)' :
                                next === 'rejected'  ? 'var(--red)'   :
                                'var(--t2)',
                              border: '1px solid var(--border)',
                              fontSize: 12,
                              padding: '6px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              opacity: busy === r.id ? 0.5 : 1,
                            }}
                          >
                            {next === 'converted' && <><CheckCircle size={11} /> Approve</>}
                            {next === 'rewarded'  && <><Award       size={11} /> Mark paid</>}
                            {next === 'rejected'  && <><XCircle     size={11} /> Reject</>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}
