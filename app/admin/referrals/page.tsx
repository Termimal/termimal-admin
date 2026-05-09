'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users2, CheckCircle, XCircle, DollarSign, Clock, Award } from 'lucide-react'
import { HeroCard, Section, EmptyState, Tabs } from '@/components/admin/PageChrome'

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

const STATUS_META: Record<Status, { label: string; badge: string }> = {
  pending:   { label: 'Pending',   badge: 'badge-muted' },
  converted: { label: 'Converted', badge: 'badge-blue' },
  rewarded:  { label: 'Rewarded',  badge: 'badge-green' },
  rejected:  { label: 'Rejected',  badge: 'badge-red' },
}

const NEXT_TRANSITIONS: Record<Status, Status[]> = {
  pending:   ['converted', 'rejected'],
  converted: ['rewarded',  'rejected'],
  rewarded:  [],
  rejected:  [],
}

function KPI({ label, value, secondary, icon, accent }: { label: string; value: React.ReactNode; secondary?: React.ReactNode; icon: React.ReactNode; accent: 'green'|'amber'|'blue'|'red'|'muted' }) {
  const colorMap = { green: 'var(--green)', amber: 'var(--amber)', blue: 'var(--blue)', red: 'var(--red)', muted: 'var(--t3)' }
  return (
    <div className="card-premium" style={{
      padding: '24px 28px',
      borderColor: accent === 'muted' ? 'var(--border)' : `${colorMap[accent]}44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t4)' }}>{label}</span>
        <span style={{ color: colorMap[accent] }}>{icon}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: colorMap[accent], fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', lineHeight: 1 }}>{value}</div>
      {secondary && <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 8, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{secondary}</div>}
    </div>
  )
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
    <div>
      <HeroCard
        accent="green"
        icon={<Users2 size={28}/>}
        eyebrow="Finance"
        title="Referral payouts"
        subtitle="Approve or reject referral conversions, set the reward amount, and mark them as paid out. Pay-out happens out-of-band — status here is the audit trail."
        metric={stats ? { label: 'Total paid', value: `$${stats.total_paid_out.toFixed(2)}`, secondary: `$${stats.pending_owed.toFixed(2)} owed` } : undefined}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <KPI label="Pending review"   value={stats?.pending  ?? 0} icon={<Clock size={16}/>}      accent="muted"/>
        <KPI label="Converted (owed)" value={stats?.converted ?? 0} secondary={stats ? `$${stats.pending_owed.toFixed(2)}`  : undefined} icon={<DollarSign size={16}/>} accent="blue"/>
        <KPI label="Rewarded"         value={stats?.rewarded ?? 0} secondary={stats ? `$${stats.total_paid_out.toFixed(2)}` : undefined} icon={<Award size={16}/>}     accent="green"/>
        <KPI label="Rejected"         value={stats?.rejected ?? 0} icon={<XCircle size={16}/>}    accent="red"/>
      </div>

      <Tabs items={items} active={tab} onChange={k => setTab(k as 'all' | Status)} accent="green" />

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
                <li key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span className={`badge ${m.badge}`}>{m.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.5 }}>
                        <strong>{r.referrer?.full_name || r.referrer?.email || r.referrer_id.slice(0, 8) + '…'}</strong>
                        <span style={{ color: 'var(--t4)', margin: '0 8px' }}>→</span>
                        <strong>{r.referred?.full_name || r.referred?.email || r.referred_id.slice(0, 8) + '…'}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
                        {r.referrer?.email} → {r.referred?.email}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Reward $</label>
                      <input
                        className="input"
                        type="number" step="0.01" min="0"
                        style={{ width: 110, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
                        defaultValue={r.reward_amount}
                        disabled={r.status === 'rewarded' || r.status === 'rejected'}
                        onChange={e => setEditAmount(prev => ({ ...prev, [r.id]: e.target.value }))}
                      />
                    </div>

                    {allowed.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {allowed.map(next => (
                          <button
                            key={next}
                            type="button"
                            disabled={busy === r.id}
                            onClick={() => transition(r.id, next, r.reward_amount)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              color:
                                next === 'converted' ? 'var(--blue)'  :
                                next === 'rewarded'  ? 'var(--green)' :
                                next === 'rejected'  ? 'var(--red)'   :
                                'var(--t2)',
                              opacity: busy === r.id ? 0.5 : 1,
                            }}
                          >
                            {next === 'converted' && <><CheckCircle size={12} /> Approve</>}
                            {next === 'rewarded'  && <><Award       size={12} /> Mark paid</>}
                            {next === 'rejected'  && <><XCircle     size={12} /> Reject</>}
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
