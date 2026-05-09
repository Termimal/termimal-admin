'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Copy, CheckCircle, XCircle, RefreshCw, Mail, User,
  CreditCard, Gift, History, Activity, Settings, Shield, Zap,
  Star, LogIn, Monitor, Smartphone, Tablet, Crown, Ban, Unlock,
  Edit3, Hash, AlertTriangle, TestTube2, UserCheck, Building2,
  Receipt, Pin, MessageSquare, Trash2, Skull, Highlighter, Bold, Italic,
  Eraser, BadgeCheck, Globe, Clock, Calendar, KeyRound, AtSign, IdCard,
} from 'lucide-react'

const PLANS = ['free', 'starter', 'pro', 'premium'] as const
const PLAN_META: Record<string, { color: string; label: string; badge: string }> = {
  free:     { color: 'var(--t4)',      label: 'Free',     badge: 'badge-muted'   },
  starter:  { color: 'var(--blue)',    label: 'Starter',  badge: 'badge-blue'    },
  pro:      { color: 'var(--acc)',     label: 'Pro',      badge: 'badge-acc'     },
  premium:  { color: 'var(--purple)',  label: 'Premium',  badge: 'badge-purple'  },
}
const STATUS_META: Record<string, string> = {
  active:'badge-green', trialing:'badge-blue', past_due:'badge-amber',
  canceled:'badge-red', unpaid:'badge-red', inactive:'badge-muted',
}
const ACCOUNT_META: Record<string, { badge: string }> = {
  active:    { badge:'badge-green' },
  suspended: { badge:'badge-amber' },
  closed:    { badge:'badge-red'   },
}
const USER_TYPES = [
  { value:'normal',   label:'Normal',   icon:<UserCheck  size={13}/>, badge:'badge-muted'   },
  { value:'test',     label:'Test',     icon:<TestTube2  size={13}/>, badge:'badge-amber'   },
  { value:'internal', label:'Internal', icon:<Building2  size={13}/>, badge:'badge-blue'    },
  { value:'vip',      label:'VIP',      icon:<Crown      size={13}/>, badge:'badge-purple'  },
]
const SUB_PACKAGES = [
  { id:'free_trial_7d',  plan:'free',    months:0, days:7,  label:'Free Trial 7d',  group:'Trial',   color:'var(--t3)' },
  { id:'free_trial_14d', plan:'free',    months:0, days:14, label:'Free Trial 14d', group:'Trial',   color:'var(--t3)' },
  { id:'free_trial_30d', plan:'free',    months:0, days:30, label:'Free Trial 30d', group:'Trial',   color:'var(--t3)' },
  { id:'starter_1m',  plan:'starter', months:1,  days:0, label:'Starter 1mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_2m',  plan:'starter', months:2,  days:0, label:'Starter 2mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_3m',  plan:'starter', months:3,  days:0, label:'Starter 3mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_6m',  plan:'starter', months:6,  days:0, label:'Starter 6mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_12m', plan:'starter', months:12, days:0, label:'Starter 1yr',  group:'Starter', color:'var(--blue)'   },
  { id:'pro_1m',  plan:'pro', months:1,  days:0, label:'Pro 1mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_2m',  plan:'pro', months:2,  days:0, label:'Pro 2mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_3m',  plan:'pro', months:3,  days:0, label:'Pro 3mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_6m',  plan:'pro', months:6,  days:0, label:'Pro 6mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_12m', plan:'pro', months:12, days:0, label:'Pro 1yr',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_24m', plan:'pro', months:24, days:0, label:'Pro 2yr',  group:'Pro', color:'var(--acc)'    },
  { id:'premium_1m',  plan:'premium', months:1,  days:0, label:'Premium 1mo',  group:'Premium', color:'var(--purple)' },
  { id:'premium_3m',  plan:'premium', months:3,  days:0, label:'Premium 3mo',  group:'Premium', color:'var(--purple)' },
  { id:'premium_6m',  plan:'premium', months:6,  days:0, label:'Premium 6mo',  group:'Premium', color:'var(--purple)' },
  { id:'premium_12m', plan:'premium', months:12, days:0, label:'Premium 1yr',  group:'Premium', color:'var(--purple)' },
]
const CREDIT_PACKAGES = [
  { id:'c50',   credits:50,   label:'50 credits'    },
  { id:'c100',  credits:100,  label:'100 credits'   },
  { id:'c250',  credits:250,  label:'250 credits'   },
  { id:'c500',  credits:500,  label:'500 credits'   },
  { id:'c1000', credits:1000, label:'1,000 credits' },
  { id:'c5000', credits:5000, label:'5,000 credits' },
]
const DISCOUNT_PRESETS = [10, 20, 25, 30, 50, 75, 100]
const TABS = [
  { key:'overview',     label:'Overview',     icon:<User size={14}/>          },
  { key:'subscription', label:'Subscription', icon:<CreditCard size={14}/>    },
  { key:'packages',     label:'Packages',     icon:<Gift size={14}/>          },
  { key:'credits',      label:'Credits',      icon:<Hash size={14}/>          },
  { key:'timeline',     label:'Timeline',     icon:<MessageSquare size={14}/> },
  { key:'activity',     label:'Activity',     icon:<Activity size={14}/>      },
  { key:'settings',     label:'Settings',     icon:<Settings size={14}/>      },
]
const NOTE_KINDS: Array<{ value: string; label: string; color: string }> = [
  { value: 'note',          label: 'Note',          color: 'var(--t3)'    },
  { value: 'support',       label: 'Support',       color: 'var(--blue)'  },
  { value: 'billing_event', label: 'Billing event', color: 'var(--green)' },
  { value: 'admin_action',  label: 'Admin action',  color: 'var(--amber)' },
  { value: 'system',        label: 'System',        color: 'var(--t4)'    },
]

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ color:'var(--t4)', fontSize:12, whiteSpace:'nowrap', flexShrink:0 }}>{label}</span>
      <span style={{ color:'var(--t2)', fontSize:12, textAlign:'right', fontFamily: mono ? 'monospace' : 'inherit', wordBreak:'break-all' }}>{value ?? '—'}</span>
    </div>
  )
}
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
      style={{ background:'none', border:'none', cursor:'pointer', color: ok ? 'var(--acc)' : 'var(--t4)', padding:'0 2px', lineHeight:1, display:'inline-flex', alignItems:'center' }}>
      {ok ? <CheckCircle size={12}/> : <Copy size={12}/>}
    </button>
  )
}
function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
      <span style={{ color:'var(--acc)' }}>{icon}</span>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'var(--t4)', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}
function EmptyState({ label }: { label: string }) {
  return <div style={{ padding:'32px 0', textAlign:'center', color:'var(--t4)', fontSize:13 }}>{label}</div>
}

/**
 * Boxed key/value cell — replaces the cramped <InfoRow> rows. Used in
 * a CSS grid so identity / subscription data lays out as a tile-set
 * instead of a stack of thin rows.
 */
function DataCell({
  label, value, icon, mono, copyable, accent, span,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  mono?: boolean
  copyable?: string
  accent?: string
  /** Set to 2 to take both columns of the parent 2-col grid. */
  span?: 1 | 2
}) {
  return (
    <div style={{
      gridColumn: span === 2 ? '1 / -1' : 'auto',
      padding: '14px 18px',
      borderRadius: 14,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 8,
      minWidth: 0,
      transition: 'border-color 160ms, background 160ms',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em',
        textTransform: 'uppercase', color: 'var(--t4)',
      }}>
        {icon && <span style={{ display: 'inline-flex', color: 'var(--t4)' }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 14.5, fontWeight: 600,
        color: accent || 'var(--t1)',
        fontFamily: mono ? 'ui-monospace, Menlo, Consolas, monospace' : 'inherit',
        wordBreak: 'break-all',
        lineHeight: 1.35,
        minHeight: 22,
      }}>
        {value ?? <span style={{ color: 'var(--t4)' }}>—</span>}
        {copyable && <CopyBtn text={copyable} />}
      </div>
    </div>
  )
}

/**
 * Allow-list of HTML tags + attrs accepted from the notes editor.
 * The contentEditable area is sanitised on every change — anything else
 * is stripped before we send the value upstream. We don't trust admin
 * input either, since notes can be displayed back to other admins.
 */
const ALLOWED_TAGS = new Set(['MARK', 'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN'])
function sanitizeHtml(html: string): string {
  if (typeof document === 'undefined') return html
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes)
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        if (!ALLOWED_TAGS.has(el.tagName)) {
          // Replace disallowed element with its text contents.
          while (el.firstChild) node.insertBefore(el.firstChild, el)
          node.removeChild(el)
          continue
        }
        // Strip every attribute except a single 'style' attr on <mark>
        // that we control ourselves.
        for (const attr of Array.from(el.attributes)) {
          if (el.tagName === 'MARK' && attr.name === 'style') continue
          el.removeAttribute(attr.name)
        }
        if (el.tagName === 'MARK') {
          el.setAttribute('style',
            'background:var(--amber-bg);color:var(--amber);padding:0 3px;border-radius:3px;')
        }
        walk(el)
      } else if (child.nodeType !== Node.TEXT_NODE) {
        node.removeChild(child)
      }
    }
  }
  walk(tpl.content)
  return tpl.innerHTML
}

/**
 * contentEditable notes panel with a small toolbar (highlight, bold,
 * italic, clear). Internally we use document.execCommand which is
 * "deprecated" but still ships in every browser and is by far the
 * simplest way to do per-selection styling without pulling in a
 * 60-kB rich-text editor.
 *
 * The value we save to the API is `sanitizeHtml(div.innerHTML)`.
 */
function HighlightableNotes({
  value, onChange, onSave, saving,
}: {
  value: string
  onChange: (next: string) => void
  onSave: () => void
  saving: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [dirty, setDirty] = useState(false)

  // Push value INTO the editor only when it changes from the outside
  // (initial load, after-save reload). Avoids cursor-jumping on every
  // keystroke.
  //
  // The legacy column stored notes as plain text — convert newlines to
  // <br> so the line breaks survive into contentEditable. If we already
  // see HTML tags we trust them through the sanitiser instead.
  useEffect(() => {
    if (!ref.current) return
    const looksLikeHtml = /<\w+[^>]*>/.test(value)
    const next = looksLikeHtml
      ? sanitizeHtml(value)
      : value.replace(/[<>&]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[c]!))
             .replace(/\n/g, '<br>')
    if (ref.current.innerHTML !== next) ref.current.innerHTML = next
  }, [value])

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    try { document.execCommand(cmd, false, arg) } catch { /* ignore */ }
    if (ref.current) {
      const cleaned = sanitizeHtml(ref.current.innerHTML)
      if (cleaned !== ref.current.innerHTML) ref.current.innerHTML = cleaned
      onChange(ref.current.innerHTML)
      setDirty(true)
    }
  }

  const highlight = () => {
    // Wrap selection in <mark>. execCommand('hiliteColor') would also
    // work but stamps inline styles on every browser-specific tag —
    // explicit <mark> insertion is cleaner to sanitise on save.
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    // If the selection is already inside a <mark>, unwrap it.
    const ancestor = range.commonAncestorContainer
    const mark = (ancestor.nodeType === Node.ELEMENT_NODE
      ? (ancestor as HTMLElement)
      : ancestor.parentElement)?.closest('mark')
    if (mark && ref.current?.contains(mark)) {
      const parent = mark.parentNode
      while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark)
      mark.remove()
      sel.removeAllRanges()
    } else {
      const m = document.createElement('mark')
      m.setAttribute('style',
        'background:var(--amber-bg);color:var(--amber);padding:0 3px;border-radius:3px;')
      try { range.surroundContents(m) } catch {
        // surroundContents fails on partial-selection across nodes —
        // fall back to extracting + wrapping.
        const frag = range.extractContents()
        m.appendChild(frag)
        range.insertNode(m)
      }
      sel.removeAllRanges()
    }
    if (ref.current) {
      const cleaned = sanitizeHtml(ref.current.innerHTML)
      if (cleaned !== ref.current.innerHTML) ref.current.innerHTML = cleaned
      onChange(ref.current.innerHTML)
      setDirty(true)
    }
  }

  const clear = () => {
    if (!ref.current) return
    // Strip ALL formatting in the entire field (most common request:
    // "I pasted from gmail and it brought a font soup with it").
    const text = ref.current.innerText
    ref.current.innerHTML = ''
    ref.current.appendChild(document.createTextNode(text))
    onChange(ref.current.innerHTML)
    setDirty(true)
  }

  return (
    <div className="card-premium" style={{
      padding: 0, overflow: 'hidden',
      position: 'sticky', top: 24,
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 56px)',
    }}>
      {/* header */}
      <div style={{
        padding: '18px 22px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'var(--amber-bg)', color: 'var(--amber)',
            border: '1px solid rgba(251,191,36,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Edit3 size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Admin Notes</div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
              Internal — never shown to the user
            </div>
          </div>
        </div>
      </div>

      {/* toolbar */}
      <div style={{
        display: 'flex', gap: 4, padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <ToolBtn label="Highlight" onClick={highlight} icon={<Highlighter size={13} />} accent="var(--amber)" />
        <ToolBtn label="Bold"      onClick={() => exec('bold')}    icon={<Bold size={13} />} />
        <ToolBtn label="Italic"    onClick={() => exec('italic')}  icon={<Italic size={13} />} />
        <ToolBtn label="Underline" onClick={() => exec('underline')} icon={<u style={{ fontFamily:'serif', fontWeight:800, fontSize:13 }}>U</u>} />
        <div style={{ flex: 1 }} />
        <ToolBtn label="Clear formatting" onClick={clear} icon={<Eraser size={13} />} />
      </div>

      {/* editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={() => {
          if (!ref.current) return
          onChange(ref.current.innerHTML)
          setDirty(true)
        }}
        onPaste={e => {
          // Force plain-text paste so a paste from Gmail / Notion doesn't
          // smuggle in a wall of inline styles, fonts, or scripts.
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
        style={{
          flex: 1, minHeight: 240, maxHeight: 'calc(100vh - 320px)',
          padding: '16px 20px',
          fontSize: 13.5, lineHeight: 1.65, color: 'var(--t1)',
          outline: 'none',
          overflowY: 'auto',
          fontFamily: 'inherit',
        }}
        data-placeholder="Internal notes, support history, special cases…"
      />

      {/* footer / save */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        gap: 10,
      }}>
        <span style={{ fontSize: 11, color: dirty ? 'var(--amber)' : 'var(--t4)' }}>
          {dirty ? '● Unsaved' : 'Saved'}
        </span>
        <button
          onClick={() => { onSave(); setDirty(false) }}
          disabled={saving}
          className="btn btn-primary btn-sm"
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}

function ToolBtn({
  label, onClick, icon, accent,
}: { label: string; onClick: () => void; icon: React.ReactNode; accent?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 11px', borderRadius: 8,
        background: 'transparent', border: '1px solid transparent',
        color: accent || 'var(--t3)',
        fontSize: 12, fontWeight: 600,
        cursor: 'pointer', transition: 'all 140ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg2)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      {icon}
    </button>
  )
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [selPlan, setSelPlan] = useState('pro')
  const [planSaving, setPlanSaving] = useState(false)
  const [selSubPkg, setSelSubPkg] = useState('')
  const [subPkgNote, setSubPkgNote] = useState('')
  const [subPkgSaving, setSubPkgSaving] = useState(false)
  const [discPct, setDiscPct] = useState('')
  const [discReason, setDiscReason] = useState('')
  const [discExpiry, setDiscExpiry] = useState('')
  const [discSaving, setDiscSaving] = useState(false)
  const [creditAmt, setCreditAmt] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [creditSaving, setCreditSaving] = useState(false)
  const [selCreditPkg, setSelCreditPkg] = useState('')
  const [userType, setUserType] = useState('normal')
  const [accountStatus, setAccountStatus] = useState('active')
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Refund panel
  const [refundInvoiceOrCharge, setRefundInvoiceOrCharge] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('requested_by_customer')
  const [refundSaving, setRefundSaving] = useState(false)

  // Timeline (customer_notes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [timeline, setTimeline] = useState<any[]>([])
  const [newNoteBody, setNewNoteBody] = useState('')
  const [newNoteKind, setNewNoteKind] = useState('note')
  const [newNotePinned, setNewNotePinned] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)

  // Permanent close
  const [closeReason, setCloseReason] = useState('')
  const [closeSaving, setCloseSaving] = useState(false)

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`)
      const json = await res.json()
      setData(json)
      setNotes(json.admin?.notes || '')
      setUserType(json.admin?.user_type || 'normal')
      setAccountStatus(json.admin?.account_status || 'active')
      setSelPlan(json.profile?.plan || 'free')
      setDiscPct(json.admin?.discount_percent ? String(json.admin.discount_percent) : '')
      setDiscReason(json.admin?.discount_reason || '')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function post(path: string, body: any, setState?: (v: boolean) => void) {
    setState?.(true)
    const res = await fetch(`/api/admin/users/${id}${path}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body),
    })
    const j = await res.json()
    setState?.(false)
    return j
  }

  async function saveNotes() {
    setNotesSaving(true)
    const j = await post('', { notes }, undefined)
    setNotesSaving(false)
    if (j.ok) { showToast(true, 'Notes saved'); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function changePlan() {
    setPlanSaving(true)
    const j = await post('/plan', { plan: selPlan })
    setPlanSaving(false)
    if (j.ok) { showToast(true, `Plan set to ${selPlan}`); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function grantSubPackage() {
    if (!selSubPkg) return
    const pkg = SUB_PACKAGES.find(p => p.id === selSubPkg)!
    setSubPkgSaving(true)
    const j = await post('/grant-package', { packageId:pkg.id, label:pkg.label, plan:pkg.plan, months:pkg.months, days:pkg.days, credits:0, note:subPkgNote })
    setSubPkgSaving(false)
    if (j.ok) { showToast(true, `Granted: ${pkg.label}`); setSelSubPkg(''); setSubPkgNote(''); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function applyDiscount() {
    const pct = parseInt(discPct)
    if (isNaN(pct) || pct < 0 || pct > 100) return showToast(false, 'Enter 0–100')
    setDiscSaving(true)
    const j = await post('/discount', { discount_percent:pct, discount_reason:discReason, discount_expires_at:discExpiry||null })
    setDiscSaving(false)
    if (j.ok) { showToast(true, `Discount set: ${pct}%`); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function applyCredit() {
    const amt = parseInt(creditAmt)
    if (isNaN(amt) || amt === 0) return showToast(false, 'Enter valid amount')
    setCreditSaving(true)
    const j = await post('/credits', { amount:amt, reason:creditReason })
    setCreditSaving(false)
    if (j.ok) { showToast(true, `Credits: ${amt > 0 ? '+' : ''}${amt}`); setCreditAmt(''); setCreditReason(''); setSelCreditPkg(''); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function saveSettings() {
    setSettingsSaving(true)
    const j = await post('', { user_type:userType, account_status:accountStatus, is_test_user: userType==='test' })
    setSettingsSaving(false)
    if (j.ok) { showToast(true, 'Settings saved'); load() }
    else showToast(false, j.error || 'Failed')
  }

  async function issueRefund() {
    if (!refundInvoiceOrCharge.trim()) return showToast(false, 'invoice_id or charge_id required')
    const isInvoice = refundInvoiceOrCharge.startsWith('in_')
    const amountCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined
    if (refundAmount && (!amountCents || amountCents <= 0)) return showToast(false, 'invalid amount')
    setRefundSaving(true)
    const res = await fetch(`/api/admin/users/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isInvoice ? { invoice_id: refundInvoiceOrCharge.trim() } : { charge_id: refundInvoiceOrCharge.trim() }),
        ...(amountCents ? { amount_cents: amountCents } : {}),
        reason: refundReason,
      }),
    })
    const j = await res.json()
    setRefundSaving(false)
    if (res.ok && j.refund) {
      showToast(true, `Refund issued: ${j.refund.id}`)
      setRefundInvoiceOrCharge(''); setRefundAmount('')
      loadTimeline()
    } else {
      showToast(false, j.error || 'Refund failed')
    }
  }

  const loadTimeline = useCallback(async () => {
    const res = await fetch(`/api/admin/customer-notes?user_id=${id}`, { cache: 'no-store' })
    const j = await res.json() as { notes?: unknown[] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTimeline((j.notes as any[]) || [])
  }, [id])

  useEffect(() => {
    if (activeTab === 'timeline') loadTimeline()
  }, [activeTab, loadTimeline])

  async function addNote() {
    if (!newNoteBody.trim()) return
    setNoteSaving(true)
    const res = await fetch('/api/admin/customer-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, body: newNoteBody, kind: newNoteKind, pinned: newNotePinned }),
    })
    const j = await res.json()
    setNoteSaving(false)
    if (res.ok) {
      setNewNoteBody(''); setNewNoteKind('note'); setNewNotePinned(false)
      loadTimeline()
      showToast(true, 'Note added')
    } else {
      showToast(false, j.error || 'Failed')
    }
  }

  async function togglePinned(noteId: string, pinned: boolean) {
    const res = await fetch('/api/admin/customer-notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId, patch: { pinned: !pinned } }),
    })
    if (res.ok) loadTimeline()
  }

  async function deleteNote(noteId: string) {
    if (!confirm('Delete this timeline entry? This cannot be undone.')) return
    const res = await fetch(`/api/admin/customer-notes?id=${encodeURIComponent(noteId)}`, { method: 'DELETE' })
    if (res.ok) { showToast(true, 'Deleted'); loadTimeline() }
  }

  async function permanentlyClose() {
    const userEmail = data?.user?.email
    const confirm1 = prompt(`Type the user's email (${userEmail || 'unknown'}) to confirm permanent account closure. This is irreversible — auth + profile + every cascading row will be deleted.`)
    if (confirm1 !== userEmail) {
      if (confirm1 !== null) showToast(false, 'Email did not match — closure aborted')
      return
    }
    setCloseSaving(true)
    const res = await fetch(`/api/admin/users/${id}/close`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: closeReason || 'closed by admin' }),
    })
    const j = await res.json()
    setCloseSaving(false)
    if (res.ok) {
      showToast(true, 'Account permanently closed')
      setTimeout(() => { window.location.href = '/admin/users' }, 1500)
    } else {
      showToast(false, j.error || 'Close failed')
    }
  }

  if (loading) return (
    <div style={{ padding:'40px 0' }}>
      {[160,120,200,120].map((w,i) => <div key={i} className="skeleton" style={{ height:16, width:w, borderRadius:8, marginBottom:12 }} />)}
    </div>
  )
  if (!data) return <div style={{ color:'var(--red)' }}>Failed to load user.</div>

  const { user, profile, admin } = data
  const loginHistory: any[] = data.loginHistory || []
  const creditHistory: any[] = data.creditHistory || []
  const overrides: any[] = data.overrides || []
  const packageHistory: any[] = admin?.package_history || []

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()
  const currentPlan = profile?.plan || 'free'
  const planM = PLAN_META[currentPlan] || PLAN_META.free
  const subStatus = profile?.subscription_status || 'inactive'
  const acctM = ACCOUNT_META[admin?.account_status || 'active'] || ACCOUNT_META.active
  const utM = USER_TYPES.find(u => u.value === (admin?.user_type || 'normal'))!
  const subGroups = ['Trial','Starter','Pro','Premium']

  return (
    <div style={{ maxWidth:1100 }}>
      {toast && (
        <div style={{
          position:'fixed', top:16, right:20, zIndex:9999,
          background: toast.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
          border:`1px solid ${toast.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: toast.ok ? 'var(--green)' : 'var(--red)',
          padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600,
          display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast.ok ? <CheckCircle size={14}/> : <XCircle size={14}/>} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:24 }}>
        <Link href="/admin/users" style={{
          display:'inline-flex', alignItems:'center', gap:8,
          fontSize:14, fontWeight:600, color:'var(--t3)',
          textDecoration:'none',
          padding:'8px 14px', borderRadius:999,
          border:'1px solid var(--border)',
          background:'var(--surface)',
          transition:'all 160ms',
        }}>
          <ArrowLeft size={14}/> Back to all users
        </Link>
      </div>

      {/* User hero — Revolut-scale */}
      <div className="card-premium" style={{
        padding: '36px 40px',
        marginBottom: 28,
        borderColor: planM.color + '44',
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>
          <div style={{
            width:72, height:72, borderRadius:22, flexShrink:0,
            background:`linear-gradient(135deg, ${planM.color}44, ${planM.color}22)`,
            border:`1px solid ${planM.color}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, fontWeight:800, color:planM.color,
            boxShadow:`0 0 24px -4px ${planM.color}55`,
          }}>{initials}</div>

          <div style={{ flex:1, minWidth:280 }}>
            <div style={{
              fontSize:11, fontWeight:800, letterSpacing:'0.14em',
              textTransform:'uppercase', color:planM.color, marginBottom:10,
            }}>
              {planM.label} · {subStatus}
            </div>
            <h1 style={{
              fontSize:30, fontWeight:800, color:'var(--t1)',
              letterSpacing:'-0.025em', lineHeight:1.1, marginBottom:14,
            }}>
              {displayName}
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              <span className={`badge ${planM.badge}`} style={{ fontSize:12, padding:'5px 13px', fontWeight:700 }}>{planM.label}</span>
              <span className={`badge ${STATUS_META[subStatus] || 'badge-muted'}`} style={{ fontSize:11, padding:'4px 11px' }}>{subStatus}</span>
              <span className={`badge ${acctM.badge}`} style={{ fontSize:11, padding:'4px 11px' }}>{admin?.account_status || 'active'}</span>
              <span className={`badge ${utM.badge}`} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'4px 11px' }}>
                {utM.icon} {utM.label}
              </span>
              {admin?.discount_percent > 0 && (
                <span className="badge badge-amber" style={{ fontSize:11, padding:'4px 11px' }}>
                  ⚡ {admin.discount_percent}% off
                </span>
              )}
            </div>
            <div style={{
              display:'flex', gap:20, flexWrap:'wrap',
              fontSize:13, color:'var(--t3)',
              alignItems:'center',
            }}>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Mail size={13}/> {user?.email} <CopyBtn text={user?.email || ''}/>
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'ui-monospace,monospace', fontSize:12 }}>
                <Hash size={12}/> {user?.id?.slice(0,8)}… <CopyBtn text={user?.id || ''}/>
              </span>
              {profile?.stripe_customer_id && (
                <span style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'ui-monospace,monospace', fontSize:12 }}>
                  Stripe: {profile.stripe_customer_id.slice(0,16)}… <CopyBtn text={profile.stripe_customer_id}/>
                </span>
              )}
            </div>
          </div>

          <button onClick={load} className="btn btn-secondary btn-sm" style={{
            minHeight:38, flexShrink:0, padding:'8px 16px', fontSize:13,
          }}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>

        {/* Three big metric tiles below the identity row */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',
          gap:14,
          marginTop:24,
          paddingTop:24,
          borderTop:'1px solid var(--border)',
        }}>
          {[
            { label:'Credits',         value: admin?.credits ?? 0,                   color:'var(--amber)',  bg:'var(--amber-bg)'  },
            { label:'Bonus months',    value: admin?.subscription_bonus_months ?? 0, color:'var(--acc)',    bg:'var(--acc-bg)'    },
            { label:'Packages granted',value: packageHistory.length,                 color:'var(--purple)', bg:'var(--purple-bg)' },
          ].map(s => (
            <div key={s.label} style={{
              padding:'18px 20px',
              borderRadius:'var(--r-lg)',
              background:s.bg,
              border:`1px solid ${s.color}33`,
            }}>
              <div style={{
                fontSize:11, fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:s.color, marginBottom:8,
              }}>{s.label}</div>
              <div style={{
                fontSize:30, fontWeight:800, color:'var(--t1)',
                letterSpacing:'-0.025em', lineHeight:1, fontVariantNumeric:'tabular-nums',
              }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs — pill-style, generous */}
      <div style={{
        display:'flex', gap:6, marginBottom:24,
        background:'var(--surface)',
        border:'1px solid var(--border)',
        borderRadius:'var(--r-xl)',
        padding:6,
        width:'fit-content', maxWidth:'100%',
        flexWrap:'wrap',
        boxShadow:'var(--shadow-sm)',
      }}>
        {TABS.map(t => {
          const on = activeTab === t.key
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'10px 18px', borderRadius:'var(--r-lg)',
                border:on ? '1px solid var(--acc-border)' : '1px solid transparent',
                cursor:'pointer', fontSize:14,
                background: on
                  ? 'linear-gradient(180deg, var(--acc-bg), color-mix(in srgb, var(--acc) 8%, transparent))'
                  : 'transparent',
                color: on ? 'var(--acc)' : 'var(--t3)',
                fontWeight: on ? 700 : 500,
                letterSpacing:'-0.005em',
                boxShadow: on ? '0 0 12px -4px var(--acc)' : 'none',
                transition:'all 160ms cubic-bezier(0.16,1,0.3,1)',
              }}>{t.icon} {t.label}</button>
          )
        })}
      </div>

      {/* OVERVIEW
          ── 2-column layout ───────────────────────────────────────
          Main column: Profile + Subscription as boxed data-cell grids
          Right rail:  HighlightableNotes (sticky) */}
      {activeTab === 'overview' && (
        <div className="overview-grid">
          {/* MAIN ─────────────────────────────────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, minWidth:0 }}>

            {/* Profile card — boxed cells in a 2-col grid */}
            <div className="card-premium" style={{ padding:'24px 28px' }}>
              <SectionTitle icon={<User size={15}/>} title="Profile" sub="Identity, locale, and account metadata." />
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',
                gap:12,
              }}>
                <DataCell
                  label="Email" icon={<AtSign size={11}/>}
                  value={user?.email}
                  copyable={user?.email}
                />
                <DataCell
                  label="Full name" icon={<User size={11}/>}
                  value={profile?.full_name}
                />
                <DataCell
                  label="Country" icon={<Globe size={11}/>}
                  value={profile?.country}
                />
                <DataCell
                  label="Timezone" icon={<Clock size={11}/>}
                  value={profile?.timezone || 'UTC'}
                />
                <DataCell
                  label="Email verified" icon={<BadgeCheck size={11}/>}
                  value={user?.email_confirmed_at
                    ? <span style={{ color:'var(--green)' }}>✓ Verified</span>
                    : <span style={{ color:'var(--red)' }}>✗ Not verified</span>}
                />
                <DataCell
                  label="Auth provider" icon={<KeyRound size={11}/>}
                  value={user?.app_metadata?.provider || 'email'}
                />
                <DataCell
                  label="Joined" icon={<Calendar size={11}/>}
                  value={user?.created_at ? new Date(user.created_at).toLocaleString() : null}
                />
                <DataCell
                  label="Last login" icon={<LogIn size={11}/>}
                  value={user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : <span style={{ color:'var(--t4)' }}>Never</span>}
                />
                <DataCell
                  label="User ID" icon={<IdCard size={11}/>}
                  value={user?.id} mono copyable={user?.id} span={2}
                />
              </div>
            </div>

            {/* Subscription card — boxed cells, badges as values */}
            <div className="card-premium" style={{ padding:'24px 28px' }}>
              <SectionTitle icon={<CreditCard size={15}/>} title="Subscription" sub="Stripe linkage, plan, billing cycle." />
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',
                gap:12,
              }}>
                <DataCell
                  label="Plan"
                  value={<span className={`badge ${planM.badge}`} style={{ fontSize:12, padding:'4px 12px', fontWeight:700 }}>{currentPlan}</span>}
                />
                <DataCell
                  label="Status"
                  value={<span className={`badge ${STATUS_META[subStatus] || 'badge-muted'}`} style={{ fontSize:11, padding:'3px 11px' }}>{subStatus}</span>}
                />
                <DataCell
                  label="Billing interval"
                  value={profile?.billing_interval}
                />
                <DataCell
                  label="Period end"
                  value={profile?.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : null}
                />
                <DataCell
                  label="Trial ends"
                  value={profile?.trial_ends_at ? new Date(profile.trial_ends_at).toLocaleDateString() : null}
                />
                <DataCell
                  label="Bonus months"
                  value={admin?.subscription_bonus_months ?? 0}
                  accent={(admin?.subscription_bonus_months ?? 0) > 0 ? 'var(--acc)' : undefined}
                />
                <DataCell
                  label="Discount"
                  value={admin?.discount_percent
                    ? <span style={{ color:'var(--amber)' }}>{admin.discount_percent}% off</span>
                    : null}
                />
                <DataCell
                  label="Discount reason"
                  value={admin?.discount_reason}
                />
                <DataCell
                  label="Stripe customer"
                  value={profile?.stripe_customer_id} mono
                  copyable={profile?.stripe_customer_id || undefined}
                  span={2}
                />
                <DataCell
                  label="Stripe subscription"
                  value={profile?.stripe_subscription_id} mono
                  copyable={profile?.stripe_subscription_id || undefined}
                  span={2}
                />
                <DataCell
                  label="Last admin action"
                  value={admin?.last_admin_action}
                  span={2}
                />
              </div>
            </div>
          </div>

          {/* RIGHT RAIL — Admin Notes panel ─────────────────────── */}
          <HighlightableNotes
            value={notes}
            onChange={setNotes}
            onSave={saveNotes}
            saving={notesSaving}
          />
        </div>
      )}

      {/* SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<Zap size={15}/>} title="Set Plan Directly" sub="Admin override — bypasses Stripe billing" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {PLANS.map(p => (
                <button key={p} onClick={() => setSelPlan(p)}
                  style={{
                    padding:'10px 14px', borderRadius:8, cursor:'pointer', textAlign:'left', fontSize:13, fontWeight:600,
                    background: selPlan === p ? `${PLAN_META[p].color}18` : 'var(--surface)',
                    border:`1.5px solid ${selPlan === p ? PLAN_META[p].color + '66' : 'var(--border)'}`,
                    color: selPlan === p ? PLAN_META[p].color : 'var(--t2)',
                    transition:'all 0.15s',
                  }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
              ))}
            </div>
            <button onClick={changePlan} disabled={planSaving} className="btn btn-primary" style={{ width:'100%' }}>
              {planSaving ? 'Applying…' : `Apply "${selPlan}" plan`}
            </button>
          </div>

          <div className="card card-p">
            <SectionTitle icon={<Star size={15}/>} title="Subscription Discount" sub="% off their next billing cycle" />
            <label className="label">Discount %</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {DISCOUNT_PRESETS.map(p => (
                <button key={p} onClick={() => setDiscPct(String(p))}
                  style={{
                    padding:'4px 10px', borderRadius:6, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: discPct === String(p) ? 'var(--amber-bg)' : 'var(--surface)',
                    borderColor: discPct === String(p) ? 'rgba(251,191,36,0.3)' : 'var(--border)',
                    color: discPct === String(p) ? 'var(--amber)' : 'var(--t3)',
                  }}>{p}%</button>
              ))}
            </div>
            <input className="input" style={{ marginBottom:10 }} type="number" value={discPct} onChange={e => setDiscPct(e.target.value)} placeholder="Custom %" />
            <label className="label">Reason</label>
            <input className="input" style={{ marginBottom:10 }} value={discReason} onChange={e => setDiscReason(e.target.value)} placeholder="Loyalty, support credit, promo…" />
            <label className="label">Expires (optional)</label>
            <input className="input" style={{ marginBottom:14 }} type="date" value={discExpiry} onChange={e => setDiscExpiry(e.target.value)} />
            <button onClick={applyDiscount} disabled={discSaving} className="btn btn-primary" style={{ width:'100%' }}>
              {discSaving ? 'Applying…' : 'Set Discount'}
            </button>
          </div>

          <div className="card card-p" style={{ gridColumn:'1 / -1' }}>
            <SectionTitle icon={<Gift size={15}/>} title="Grant Free Subscription Period" sub="Adds bonus months on top of their current subscription — 18 packages available" />
            {subGroups.map(group => {
              const pkgs = SUB_PACKAGES.filter(p => p.group === group)
              return (
                <div key={group} style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{group}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {pkgs.map(pkg => (
                      <button key={pkg.id} onClick={() => setSelSubPkg(pkg.id === selSubPkg ? '' : pkg.id)}
                        style={{
                          padding:'7px 14px', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                          background: selSubPkg === pkg.id ? pkg.color + '18' : 'var(--surface)',
                          borderColor: selSubPkg === pkg.id ? pkg.color + '66' : 'var(--border)',
                          color: selSubPkg === pkg.id ? pkg.color : 'var(--t3)',
                          transition:'all 0.12s',
                        }}>{pkg.label}</button>
                    ))}
                  </div>
                </div>
              )
            })}
            {selSubPkg && (
              <div style={{ marginTop:8, display:'flex', gap:10, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <label className="label">Note (optional)</label>
                  <input className="input" value={subPkgNote} onChange={e => setSubPkgNote(e.target.value)} placeholder="e.g. 'Support gesture', 'Promo LAUNCH2026'" />
                </div>
                <button onClick={grantSubPackage} disabled={subPkgSaving} className="btn btn-primary" style={{ flexShrink:0 }}>
                  {subPkgSaving ? 'Granting…' : `✓ Grant ${SUB_PACKAGES.find(p => p.id === selSubPkg)?.label}`}
                </button>
              </div>
            )}
          </div>

          <div className="card card-p" style={{ gridColumn:'1 / -1' }}>
            <SectionTitle icon={<Receipt size={15}/>} title="Issue refund" sub="Refunds an invoice or charge directly through Stripe — also writes a billing_event entry to the user's timeline." />
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:10, alignItems:'flex-end' }}>
              <div>
                <label className="label">Invoice ID (in_…) or Charge ID (ch_…)</label>
                <input className="input" value={refundInvoiceOrCharge} onChange={e => setRefundInvoiceOrCharge(e.target.value)} placeholder="in_1Q… or ch_3Q…" style={{ fontFamily:'monospace', fontSize:12 }} />
              </div>
              <div>
                <label className="label">Amount (USD, blank = full)</label>
                <input className="input" type="number" step="0.01" min="0" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="49.00" />
              </div>
              <div>
                <label className="label">Reason</label>
                <select className="input" value={refundReason} onChange={e => setRefundReason(e.target.value)}>
                  <option value="requested_by_customer">Requested by customer</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="fraudulent">Fraudulent</option>
                </select>
              </div>
              <button onClick={issueRefund} disabled={refundSaving || !refundInvoiceOrCharge.trim()} className="btn btn-primary">
                {refundSaving ? 'Refunding…' : 'Issue refund'}
              </button>
            </div>
            <div style={{ fontSize:11, color:'var(--t4)', marginTop:8 }}>
              Tip: paste the invoice id from the Payments tab — leaving amount blank refunds the full remaining amount.
            </div>
          </div>

          <div className="card card-p" style={{ gridColumn:'1 / -1' }}>
            <SectionTitle icon={<History size={15}/>} title="Override History" />
            {overrides.length === 0 ? <EmptyState label="No overrides applied yet." /> : (
              <div className="table-wrap">
                <table className="table-root">
                  <thead><tr><th>Type</th><th>Plan</th><th>Months</th><th>Discount</th><th>Reason</th><th>Applied</th></tr></thead>
                  <tbody>
                    {overrides.map((o:any) => (
                      <tr key={o.id}>
                        <td><span className="badge badge-acc">{o.type}</span></td>
                        <td>{o.plan ? <span className={`badge ${PLAN_META[o.plan]?.badge || 'badge-muted'}`}>{o.plan}</span> : '—'}</td>
                        <td style={{ color:'var(--t2)' }}>{o.months || '—'}</td>
                        <td style={{ color:'var(--t2)' }}>{o.discount_pct ? `${o.discount_pct}%` : '—'}</td>
                        <td style={{ color:'var(--t3)', fontSize:12 }}>{o.reason || '—'}</td>
                        <td style={{ color:'var(--t4)', fontSize:12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PACKAGES */}
      {activeTab === 'packages' && (
        <div className="card card-p">
          <SectionTitle icon={<Gift size={15}/>} title="Package Grant History" sub={`${packageHistory.length} packages granted to this user`} />
          {packageHistory.length === 0 ? <EmptyState label="No packages granted yet. Use the Subscription tab to grant packages." /> : (
            <div className="table-wrap">
              <table className="table-root">
                <thead><tr><th>Package</th><th>Plan</th><th>Duration</th><th>Credits</th><th>Note</th><th>Granted</th></tr></thead>
                <tbody>
                  {[...packageHistory].reverse().map((h:any, i:number) => (
                    <tr key={i}>
                      <td style={{ fontWeight:600, color:'var(--t1)' }}>{h.label || h.packageId}</td>
                      <td>{h.plan ? <span className={`badge ${PLAN_META[h.plan]?.badge || 'badge-muted'}`}>{h.plan}</span> : '—'}</td>
                      <td style={{ color:'var(--t2)' }}>{h.months ? `${h.months}mo` : h.days ? `${h.days}d` : '—'}</td>
                      <td style={{ color:'var(--amber)' }}>{h.credits || '—'}</td>
                      <td style={{ color:'var(--t4)', fontSize:12 }}>{h.note || '—'}</td>
                      <td style={{ color:'var(--t4)', fontSize:12 }}>{new Date(h.granted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREDITS */}
      {activeTab === 'credits' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<Hash size={15}/>} title="Adjust Credits" sub="Positive to add, negative to deduct" />
            <label className="label" style={{ marginBottom:8 }}>Quick grant</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {CREDIT_PACKAGES.map(cp => (
                <button key={cp.id} onClick={() => { setSelCreditPkg(cp.id); setCreditAmt(String(cp.credits)) }}
                  style={{
                    padding:'6px 12px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: selCreditPkg === cp.id ? 'var(--amber-bg)' : 'var(--surface)',
                    borderColor: selCreditPkg === cp.id ? 'rgba(251,191,36,0.35)' : 'var(--border)',
                    color: selCreditPkg === cp.id ? 'var(--amber)' : 'var(--t3)',
                    transition:'all 0.12s',
                  }}>{cp.label}</button>
              ))}
            </div>
            <label className="label" style={{ marginBottom:8 }}>Quick deduct</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {[50,100,250,500].map(amt => (
                <button key={amt} onClick={() => { setSelCreditPkg(`deduct_${amt}`); setCreditAmt(String(-amt)) }}
                  style={{
                    padding:'6px 12px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: creditAmt === String(-amt) && selCreditPkg === `deduct_${amt}` ? 'var(--red-bg)' : 'var(--surface)',
                    borderColor: creditAmt === String(-amt) && selCreditPkg === `deduct_${amt}` ? 'rgba(248,113,113,0.3)' : 'var(--border)',
                    color: creditAmt === String(-amt) && selCreditPkg === `deduct_${amt}` ? 'var(--red)' : 'var(--t3)',
                  }}>-{amt}</button>
              ))}
            </div>
            <label className="label">Custom amount</label>
            <input className="input" style={{ marginBottom:10 }} type="number" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} placeholder="e.g. 200 or -50" />
            <label className="label">Reason</label>
            <input className="input" style={{ marginBottom:14 }} value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Refund, promo, support credit…" />
            <button onClick={applyCredit} disabled={creditSaving} className="btn btn-primary" style={{ width:'100%' }}>
              {creditSaving ? 'Applying…' : 'Apply Credit Adjustment'}
            </button>
          </div>
          <div className="card card-p">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:'var(--acc)' }}><History size={15}/></span>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Credit History</span>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--amber)', fontVariantNumeric:'tabular-nums' }}>{admin?.credits ?? 0}</div>
                <div style={{ fontSize:10, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Balance</div>
              </div>
            </div>
            {creditHistory.length === 0 ? <EmptyState label="No credit history yet." /> : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {creditHistory.map((c:any) => (
                  <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--surface)', borderRadius:8, padding:'8px 12px', fontSize:13 }}>
                    <span style={{ color:'var(--t3)', flex:1 }}>{c.reason || 'Adjustment'}</span>
                    <span style={{ color: c.amount > 0 ? 'var(--green)' : 'var(--red)', fontWeight:700, marginLeft:12, fontVariantNumeric:'tabular-nums' }}>
                      {c.amount > 0 ? '+' : ''}{c.amount}
                    </span>
                    <span style={{ color:'var(--t4)', fontSize:11, marginLeft:12 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TIMELINE */}
      {activeTab === 'timeline' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<MessageSquare size={15}/>} title="Add timeline entry" sub="Notes are internal-only. Pin to keep at the top of every admin's view." />
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:10, alignItems:'flex-end' }}>
              <div>
                <label className="label">Body</label>
                <textarea
                  rows={2}
                  className="input"
                  style={{ resize:'vertical', fontFamily:'inherit' }}
                  value={newNoteBody}
                  onChange={e => setNewNoteBody(e.target.value)}
                  placeholder="Customer called about double-charge; refunded one invoice."
                />
              </div>
              <div>
                <label className="label">Kind</label>
                <select className="input" value={newNoteKind} onChange={e => setNewNoteKind(e.target.value)}>
                  {NOTE_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--t3)', cursor:'pointer', paddingBottom:8 }}>
                <input type="checkbox" checked={newNotePinned} onChange={e => setNewNotePinned(e.target.checked)} />
                <Pin size={12}/> Pin
              </label>
              <button onClick={addNote} disabled={noteSaving || !newNoteBody.trim()} className="btn btn-primary">
                {noteSaving ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>

          <div className="card card-p">
            <SectionTitle icon={<History size={15}/>} title={`Timeline (${timeline.length})`} sub="Notes, billing events, support replies, admin actions — newest first." />
            {timeline.length === 0 ? <EmptyState label="No timeline entries yet — add a note above or trigger a billing event." /> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {timeline.map((n: any) => {
                  const meta = NOTE_KINDS.find(k => k.value === n.kind) || NOTE_KINDS[0]
                  return (
                    <div key={n.id} style={{
                      border:'1px solid var(--border)',
                      borderLeft: `3px solid ${n.pinned ? 'var(--amber)' : meta.color}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      background: n.pinned ? 'rgba(251,191,36,0.04)' : 'var(--surface)',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, fontSize:11, color:'var(--t4)' }}>
                        <span style={{ color: meta.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{meta.label}</span>
                        {n.pinned && <span style={{ color:'var(--amber)', display:'inline-flex', alignItems:'center', gap:3 }}><Pin size={10}/> pinned</span>}
                        <span style={{ marginLeft:'auto' }}>{new Date(n.created_at).toLocaleString()}</span>
                        {n.author && <span>· {n.author.full_name || n.author.email}</span>}
                      </div>
                      <div style={{ fontSize:13, color:'var(--t1)', whiteSpace:'pre-wrap', lineHeight:1.5 }}>{n.body}</div>
                      <div style={{ display:'flex', gap:6, marginTop:8 }}>
                        <button onClick={() => togglePinned(n.id, n.pinned)} className="btn btn-ghost btn-sm" style={{ fontSize:11 }}>
                          <Pin size={11}/> {n.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button onClick={() => deleteNote(n.id)} className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--red)' }}>
                          <Trash2 size={11}/> Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="card card-p">
          <SectionTitle icon={<LogIn size={15}/>} title="Login History" sub="Last 50 sessions" />
          {loginHistory.length === 0 ? (
            <EmptyState label="No login history. Records appear here once the auth webhook is configured." />
          ) : (
            <div className="table-wrap">
              <table className="table-root">
                <thead><tr><th>Date & Time</th><th>IP Address</th><th>Device</th><th>Location</th><th>User Agent</th></tr></thead>
                <tbody>
                  {loginHistory.map((l:any) => (
                    <tr key={l.id}>
                      <td style={{ color:'var(--t2)', fontSize:12 }}>{new Date(l.signed_in_at).toLocaleString()}</td>
                      <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--t3)' }}>{l.ip_address || '—'}</td>
                      <td style={{ color:'var(--t3)', fontSize:12 }}>{l.device_type || 'desktop'}</td>
                      <td style={{ color:'var(--t4)', fontSize:12 }}>{[l.city, l.country].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ color:'var(--t4)', fontSize:11, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.user_agent?.slice(0,70) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<Shield size={15}/>} title="User Type" sub="Controls feature flags, test data visibility, etc." />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
              {USER_TYPES.map(ut => (
                <button key={ut.value} onClick={() => setUserType(ut.value)}
                  style={{
                    padding:'12px 14px', borderRadius:10, border:'1.5px solid', cursor:'pointer', textAlign:'left',
                    background: userType === ut.value ? 'var(--acc-bg)' : 'var(--surface)',
                    borderColor: userType === ut.value ? 'var(--acc-border)' : 'var(--border)',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ marginBottom:4, color: userType === ut.value ? 'var(--acc)' : 'var(--t4)' }}>{ut.icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color: userType === ut.value ? 'var(--t1)' : 'var(--t3)' }}>{ut.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="card card-p">
            <SectionTitle icon={<Ban size={15}/>} title="Account Status" sub="Suspended users can't log in; Closed is permanent." />
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:4 }}>
              {[
                { value:'active',    label:'Active',    desc:'Full access',              icon:<Unlock size={14}/>,         color:'var(--green)' },
                { value:'suspended', label:'Suspended', desc:'Login blocked temporarily', icon:<AlertTriangle size={14}/>,  color:'var(--amber)' },
                { value:'closed',    label:'Closed',    desc:'Account permanently closed', icon:<Ban size={14}/>,            color:'var(--red)'   },
              ].map(s => (
                <button key={s.value} onClick={() => setAccountStatus(s.value)}
                  style={{
                    padding:'12px 14px', borderRadius:10, border:'1.5px solid', cursor:'pointer', textAlign:'left',
                    display:'flex', alignItems:'center', gap:12,
                    background: accountStatus === s.value ? s.color + '12' : 'var(--surface)',
                    borderColor: accountStatus === s.value ? s.color + '44' : 'var(--border)',
                    transition:'all 0.15s',
                  }}>
                  <span style={{ color:s.color }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color: accountStatus === s.value ? s.color : 'var(--t2)' }}>{s.label}</div>
                    <div style={{ fontSize:11, color:'var(--t4)', marginTop:1 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button onClick={load} className="btn btn-secondary">Cancel</button>
            <button onClick={saveSettings} disabled={settingsSaving} className="btn btn-primary">
              {settingsSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

          <div className="card card-p" style={{
            gridColumn:'1 / -1',
            border:'1px solid rgba(248,113,113,0.35)',
            background:'rgba(248,113,113,0.04)',
          }}>
            <SectionTitle
              icon={<Skull size={15}/>}
              title="Danger zone — permanent account closure"
              sub="GDPR right-to-erasure. Deletes auth user, profile, watchlists, alerts, paper positions, customer notes, and every cascading row. Cancels Stripe subscription. Cannot be undone. Super-admin only."
            />
            <label className="label">Reason (recorded in audit log)</label>
            <input className="input" style={{ marginBottom:14 }} value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="e.g. user requested deletion under GDPR Art. 17" />
            <button
              onClick={permanentlyClose}
              disabled={closeSaving}
              className="btn"
              style={{
                background:'rgba(248,113,113,0.12)',
                color:'var(--red)',
                border:'1px solid rgba(248,113,113,0.4)',
                fontWeight:700,
              }}
            >
              {closeSaving ? 'Closing…' : '🗑  Permanently close & delete account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
