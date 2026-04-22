'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, DollarSign, RefreshCcw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type InvoiceRow = {
  id: string
  user_id: string
  amount: number
  status: string
  currency: string
  created_at?: string
}

type ProfileRow = {
  id: string
  email: string | null
}

export default function PaymentsPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      const [{ data: invoiceData, error: invoiceError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase.from('invoices').select('id, user_id, amount, status, currency, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id, email')
      ])

      if (invoiceError || profileError) {
        setError(invoiceError?.message || profileError?.message || 'Failed to load payments')
        setInvoices([])
        setProfiles([])
      } else {
        setInvoices(invoiceData || [])
        setProfiles(profileData || [])
      }

      setLoading(false)
    }

    load()
  }, [])

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p.email || p.id])), [profiles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((i) => {
      const email = profileMap.get(i.user_id) || ''
      return [email, i.user_id, i.status, i.currency].some((v) => String(v).toLowerCase().includes(q))
    })
  }, [invoices, profileMap, search])

  const grossVolume = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const failedCharges = invoices.filter((i) => i.status !== 'paid').length
  const successRate = invoices.length ? ((invoices.filter((i) => i.status === 'paid').length / invoices.length) * 100).toFixed(1) : '0.0'
  const refunds = invoices.filter((i) => i.status === 'refunded').reduce((sum, i) => sum + Number(i.amount || 0), 0)

  return (
    <div className="max-w-6xl mx-auto">
      {error ? <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gross Volume', val: `$${grossVolume.toLocaleString()}`, icon: DollarSign, color: 'var(--green-val)' },
          { label: 'Success Rate', val: `${successRate}%`, icon: Activity, color: 'var(--acc)' },
          { label: 'Refunds', val: `$${refunds.toLocaleString()}`, icon: RefreshCcw, color: 'var(--amber)' },
          { label: 'Failed Charges', val: String(failedCharges), icon: AlertTriangle, color: 'var(--red-val)' }
        ].map((m, i) => (
          <div key={i} className="p-5 rounded-xl border flex flex-col gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{m.label}</span>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <span className="text-2xl font-bold">{m.val}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex justify-between items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-sm font-bold">Recent Transactions</h3>
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search by email or ID..." className="px-3 py-1.5 text-xs rounded-md outline-none w-64 max-w-full" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
        </div>
        <table className="w-full text-left text-xs">
          <thead style={{ background: 'var(--surface)', color: 'var(--t4)' }}>
            <tr>
              <th className="px-4 py-3 font-semibold uppercase">Email / User</th>
              <th className="px-4 py-3 font-semibold uppercase">Amount</th>
              <th className="px-4 py-3 font-semibold uppercase">Status</th>
              <th className="px-4 py-3 font-semibold uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={4}>Loading payments...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={4}>No transactions found.</td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-mono">{profileMap.get(t.user_id) || t.user_id}</td>
                <td className="px-4 py-3 font-bold">${Number(t.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-[0.6rem] font-bold" style={{ background: t.status === 'paid' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: t.status === 'paid' ? 'var(--green-val)' : 'var(--red-val)' }}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--t4)' }}>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}