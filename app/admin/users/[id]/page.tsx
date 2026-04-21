'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Key, ShieldAlert, CreditCard, Activity, ExternalLink, Ban, Gift, Award, Calendar, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function UserProfile() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // UI States for the new high-end access panel
  const [activeAction, setActiveAction] = useState<'none' | 'lifetime' | 'custom_date'>('none')
  const [accessEndDate, setAccessEndDate] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setUser(data || { id: userId, email: 'user@example.com', full_name: 'Unknown User', created_at: new Date().toISOString() })
      setLoading(false)
    }
    fetchUser()
  }, [userId, supabase])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setActiveAction('none')
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handlePasswordReset = async () => {
    showToast('Password reset email has been queued.')
  }

  const handleConfirmLifetime = () => {
    // API Call goes here
    showToast('Lifetime Pro Access granted successfully.')
  }

  const handleConfirmCustomDate = () => {
    if (!accessEndDate) return
    // API Call goes here
    showToast(`Access extended until ${new Date(accessEndDate).toLocaleDateString()}.`)
  }

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!discountCode) return
    showToast(`Discount code ${discountCode.toUpperCase()} applied to next invoice.`)
    setDiscountCode('')
  }

  if (loading) return <div className="p-8 text-sm" style={{ color: 'var(--t3)' }}>Loading profile data...</div>

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: 'var(--t3)' }}>
          <ArrowLeft size={16} /> Back to Directory
        </Link>
        
        {/* Sleek inline toast notification */}
        {toastMessage && (
          <div className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2" style={{ background: 'var(--green-val)', color: 'white' }}>
            <CheckCircle2 size={16} />
            {toastMessage}
          </div>
        )}
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 rounded-xl border shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">{user?.full_name || 'Unnamed User'}</h1>
            <div className="flex items-center gap-3 text-base font-mono" style={{ color: 'var(--t3)' }}>
              <span>{user?.email}</span>
              <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>ID: {user?.id.substring(0,8)}...</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handlePasswordReset} className="px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors border hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--t1)' }}>
            <Key size={16} /> Send Password Reset
          </button>
          <button className="px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-red-500/10 text-red-500 border border-transparent hover:border-red-500/20">
            <Ban size={16} /> Suspend Account
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* COLUMN 1: OVERVIEW & PROMOTIONS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-xl border shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ShieldAlert size={18} style={{ color: 'var(--t3)' }}/> Account Status</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--t3)' }}>Registered</span>
                <span className="font-medium" style={{ color: 'var(--t1)' }}>{new Date(user?.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--t3)' }}>Last Login</span>
                <span className="font-medium" style={{ color: 'var(--t1)' }}>2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--t3)' }}>2FA Enabled</span>
                <span className="font-medium text-green-500">Yes</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard size={18} style={{ color: 'var(--t3)' }}/> Billing & Plan</h2>
            <div className="p-4 rounded-lg mb-4 border" style={{ borderColor: 'var(--acc)', background: 'var(--acc-d)' }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--acc)' }}>Current Plan</div>
              <div className="text-xl font-bold" style={{ color: 'var(--t1)' }}>Termimal Pro</div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--t3)' }}>MRR</span>
                <span className="font-mono font-medium">$49.00</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--t3)' }}>Next Invoice</span>
                <span className="font-medium">May 21, 2026</span>
              </div>
              <button className="w-full mt-4 py-2 flex justify-center items-center gap-2 text-xs font-semibold rounded border hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--t2)' }}>
                View in Stripe <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* NEW HIGH-END PROMOTIONS & ACCESS CARD */}
          <div className="p-6 rounded-xl border shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Gift size={18} style={{ color: 'var(--t3)' }}/> Access Management</h2>
            
            <div className="space-y-4">
              {/* LIFETIME ACCESS BLOCK */}
              <div className="p-1 rounded-lg border transition-all" style={{ borderColor: activeAction === 'lifetime' ? 'var(--acc)' : 'var(--border)', background: activeAction === 'lifetime' ? 'var(--bg)' : 'transparent' }}>
                <button 
                  onClick={() => setActiveAction(activeAction === 'lifetime' ? 'none' : 'lifetime')} 
                  className="w-full py-2 px-3 flex items-center justify-between text-sm font-semibold rounded transition-colors"
                  style={{ color: activeAction === 'lifetime' ? 'var(--acc)' : 'var(--t2)' }}
                >
                  <span className="flex items-center gap-2"><Award size={16} /> Lifetime Access</span>
                  <span className="text-xs font-normal" style={{ color: 'var(--t4)' }}>{activeAction === 'lifetime' ? 'Cancel' : 'Configure'}</span>
                </button>
                
                {activeAction === 'lifetime' && (
                  <div className="p-3 border-t mt-1 animate-in fade-in" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs mb-3" style={{ color: 'var(--t3)' }}>Granting lifetime access bypasses all Stripe billing. This cannot be undone automatically.</p>
                    <button onClick={handleConfirmLifetime} className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: 'var(--acc)', color: 'white' }}>
                      Confirm Lifetime Access
                    </button>
                  </div>
                )}
              </div>

              {/* CUSTOM DATE BLOCK */}
              <div className="p-1 rounded-lg border transition-all" style={{ borderColor: activeAction === 'custom_date' ? 'var(--acc)' : 'var(--border)', background: activeAction === 'custom_date' ? 'var(--bg)' : 'transparent' }}>
                <button 
                  onClick={() => setActiveAction(activeAction === 'custom_date' ? 'none' : 'custom_date')} 
                  className="w-full py-2 px-3 flex items-center justify-between text-sm font-semibold rounded transition-colors"
                  style={{ color: activeAction === 'custom_date' ? 'var(--acc)' : 'var(--t2)' }}
                >
                  <span className="flex items-center gap-2"><Calendar size={16} /> Set Expiry Date</span>
                  <span className="text-xs font-normal" style={{ color: 'var(--t4)' }}>{activeAction === 'custom_date' ? 'Cancel' : 'Configure'}</span>
                </button>

                {activeAction === 'custom_date' && (
                  <div className="p-3 border-t mt-1 animate-in fade-in" style={{ borderColor: 'var(--border)' }}>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--t2)' }}>Select end date for free access:</label>
                    <input 
                      type="date" 
                      value={accessEndDate}
                      onChange={(e) => setAccessEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none border mb-3 font-mono" 
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--t1)' }} 
                    />
                    <button 
                      onClick={handleConfirmCustomDate} 
                      disabled={!accessEndDate}
                      className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50" 
                      style={{ background: 'var(--acc)', color: 'white' }}
                    >
                      Update Access Date
                    </button>
                  </div>
                )}
              </div>
              
              {/* DISCOUNT CODE BLOCK */}
              <form onSubmit={handleApplyDiscount} className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t2)' }}>Apply Discount Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="e.g. VIP50" 
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none border font-mono uppercase" 
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--t1)' }} 
                  />
                  <button type="submit" disabled={!discountCode} className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50" style={{ background: 'var(--t1)', color: 'var(--bg)' }}>
                    Apply
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>

        {/* COLUMN 2: ACTIVITY & HISTORY */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl border shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={18} style={{ color: 'var(--t3)' }}/> Recent Login History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{ borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>
                  <tr>
                    <th className="pb-3 font-semibold">Date & Time</th>
                    <th className="pb-3 font-semibold">IP Address</th>
                    <th className="pb-3 font-semibold">Location</th>
                    <th className="pb-3 font-semibold">Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  <tr className="text-base" style={{ color: 'var(--t2)' }}>
                    <td className="py-3 font-mono text-sm">Today, 14:22</td>
                    <td className="py-3 font-mono text-xs">192.168.1.1</td>
                    <td className="py-3">Helsinki, FI</td>
                    <td className="py-3">Chrome / macOS</td>
                  </tr>
                  <tr className="text-base" style={{ color: 'var(--t2)' }}>
                    <td className="py-3 font-mono text-sm">Apr 19, 09:15</td>
                    <td className="py-3 font-mono text-xs">192.168.1.1</td>
                    <td className="py-3">Helsinki, FI</td>
                    <td className="py-3">Chrome / macOS</td>
                  </tr>
                  <tr className="text-base" style={{ color: 'var(--t2)' }}>
                    <td className="py-3 font-mono text-sm">Apr 15, 22:04</td>
                    <td className="py-3 font-mono text-xs">84.20.15.99</td>
                    <td className="py-3">Stockholm, FI</td>
                    <td className="py-3">Safari / iOS</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
