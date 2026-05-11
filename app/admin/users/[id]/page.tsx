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
import { Field } from '@/components/admin/PageChrome'

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
      <span style={{ color:'var(--t3)', fontSize:12, whiteSpace:'nowrap', flexShrink:0 }}>{label}</span>
      <span style={{ color:'var(--t1)', fontSize:12, textAlign:'right', fontFamily: mono ? 'monospace' : 'inherit', wordBreak:'break-all' }}>{value ?? '—'}</span>
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
  return <div style={{ padding:'32px 0', textAlign:'center', color:'var(--t3)', fontSize:13 }}>{label}</div>
}

/**
 * Convert ISO-3166 alpha-2 country code (e.g. "DE") to its emoji flag.
 * Works because regional-indicator code points map A-Z to 🇦-🇿 and the
 * pair-rendering is built into every modern OS font. Returns the
 * literal code as a fallback for two-letter strings the OS can't
 * render (rare).
 */
function countryFlag(code: string | null | undefined): string {
  if (!code || typeof code !== 'string' || code.length !== 2) return ''
  const A = 0x1F1E6
  const upper = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return ''
  return String.fromCodePoint(
    A + upper.charCodeAt(0) - 65,
    A + upper.charCodeAt(1) - 65,
  )
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
  // Impersonation — opens the target user's session in a new tab.
  // Super-admin only on the server. The new tab is the real user
  // session; the admin can return to admin in this tab.
  const [impersonating, setImpersonating] = useState(false)
  async function impersonate() {
    if (!confirm('Sign in AS this user in a new tab? Every action you take from there will be attributed to them. The user gets a security-feed notification. Logged in audit_log.')) return
    setImpersonating(true)
    try {
      const res = await fetch(`/api/admin/users/${id}/impersonate`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok) {
        showToast(false, j.error || `HTTP ${res.status}`)
        return
      }
      window.open(j.url, '_blank', 'noopener,noreferrer')
      showToast(true, `Opened ${j.target_email} in a new tab`)
    } finally {
      setImpersonating(false)
    }
  }

  // Quick-action trial extension — common ops path during launch
  // weeks ("user says trial ended too fast, give them another 14
  // days"). Calls the same grant-package endpoint, no package
  // picker needed.
  const [trialExtSaving, setTrialExtSaving] = useState(false)
  async function extendTrial(days: number) {
    const current = data?.profile?.plan || 'pro'
    setTrialExtSaving(true)
    const j = await post('/grant-package', {
      packageId: `trial_ext_${days}d_${Date.now()}`,
      label:     `Trial +${days}d`,
      plan:      current,
      months:    0,
      days,
      credits:   0,
      note:      `Trial extension granted from user-detail quick-action (${days} days).`,
    })
    setTrialExtSaving(false)
    if (j.ok) { showToast(true, `Trial extended by ${days} days`); load() }
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

  // Account-takeover playbook — one click "freeze + rotate password
  // + sign out everywhere". Less destructive than permanentlyClose
  // (no row deletion); used when a user reports compromise or our
  // anomaly detector flags repeated very-high-risk sessions.
  const [freezeSaving, setFreezeSaving] = useState(false)
  async function freezeAccount() {
    const reason = prompt('Reason for freeze (recorded in audit log):', 'reported compromise')
    if (reason === null) return
    setFreezeSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${id}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const j = await res.json()
      if (res.ok) {
        showToast(true,
          `Account frozen · sign-out ${j.signed_out ? '✓' : '✗'} · password reset ${j.password_reset ? '✓ sent' : '✗'}`,
        )
        load()
      } else {
        showToast(false, j.error || 'Freeze failed')
      }
    } finally {
      setFreezeSaving(false)
    }
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

          <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <button onClick={impersonate} disabled={impersonating} className="btn btn-secondary btn-sm" style={{
              minHeight:38, padding:'8px 16px', fontSize:13,
            }}>
              <LogIn size={13}/> {impersonating ? 'Opening…' : 'Sign in as user'}
            </button>
            <button onClick={load} className="btn btn-secondary btn-sm" style={{
              minHeight:38, padding:'8px 16px', fontSize:13,
            }}>
              <RefreshCw size={13}/> Refresh
            </button>
          </div>
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
                  value={profile?.country ? (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18, lineHeight:1 }}>{countryFlag(profile.country)}</span>
                      <span>{profile.country}</span>
                    </span>
                  ) : null}
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

      {/* SUBSCRIPTION
          ── Plan + Discount side-by-side, then full-width
              Grant-period / Refund / Override-history sections.
          All cards use card-premium and the new pill-button family. */}
      {activeTab === 'subscription' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:16 }}>
            {/* Set plan directly */}
            <div className="card-premium" style={{ padding:'24px 28px' }}>
              <SectionTitle icon={<Zap size={15}/>} title="Set Plan Directly" sub="Admin override — bypasses Stripe billing" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10, marginBottom:18 }}>
                {PLANS.map(p => {
                  const m = PLAN_META[p]
                  const on = selPlan === p
                  return (
                    <button key={p} onClick={() => setSelPlan(p)}
                      style={{
                        padding:'14px 18px', borderRadius:14, cursor:'pointer', textAlign:'left',
                        background: on ? `${m.color}1A` : 'var(--surface)',
                        border: `1px solid ${on ? m.color + '66' : 'var(--border)'}`,
                        boxShadow: on ? `0 0 0 3px ${m.color}22` : 'none',
                        transition:'all 160ms',
                        display:'flex', alignItems:'center', gap:12,
                      }}>
                      <div style={{
                        width:36, height:36, borderRadius:11,
                        background: on ? `${m.color}22` : 'var(--surface2)',
                        border: `1px solid ${on ? m.color + '55' : 'var(--border)'}`,
                        color: on ? m.color : 'var(--t3)',
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0,
                      }}>
                        {p === 'premium' ? <Crown size={16}/>
                         : p === 'pro'   ? <Star  size={16}/>
                         : p === 'starter' ? <Zap size={16}/>
                         :                   <UserCheck size={16}/>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{
                          fontSize:14, fontWeight:700,
                          color: on ? m.color : 'var(--t1)',
                          letterSpacing:'-0.01em',
                        }}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </div>
                        <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
                          {p === currentPlan ? 'Current plan' : `Switch to ${p}`}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <button onClick={changePlan} disabled={planSaving} className="btn btn-primary" style={{ width:'100%', minHeight:42 }}>
                {planSaving ? 'Applying…' : `Apply "${selPlan}" plan`}
              </button>

              {/* Trial extension quick-actions — single click, no
                  picker. Logs as a "Trial +Nd" package grant for
                  audit trail. */}
              <div style={{
                marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)',
              }}>
                <div style={{
                  fontSize:10.5, fontWeight:800, color:'var(--t4)',
                  textTransform:'uppercase', letterSpacing:'0.13em', marginBottom:8,
                }}>Quick: extend trial</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => extendTrial(d)}
                      disabled={trialExtSaving}
                      style={{
                        padding:'8px 16px', borderRadius:999, border:'1px solid var(--border)', cursor:'pointer',
                        background:'var(--surface)', color:'var(--t2)',
                        fontSize:12.5, fontWeight:600,
                        flex:'1 1 auto',
                      }}>+{d} days</button>
                  ))}
                </div>
                <div style={{ fontSize:11, color:'var(--t4)', marginTop:6 }}>
                  Grants the user +N days on their current plan. Logged as a package grant for audit.
                </div>
              </div>
            </div>

            {/* Subscription discount */}
            <div className="card-premium" style={{ padding:'24px 28px' }}>
              <SectionTitle icon={<Star size={15}/>} title="Subscription Discount" sub="% off their next billing cycle" />
              <Field label="Quick presets">
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {DISCOUNT_PRESETS.map(p => {
                    const on = discPct === String(p)
                    return (
                      <button key={p} onClick={() => setDiscPct(String(p))}
                        style={{
                          padding:'8px 14px', borderRadius:999, border:'1px solid', cursor:'pointer', fontSize:12.5, fontWeight:600,
                          background: on ? 'var(--amber-bg)' : 'var(--surface)',
                          borderColor: on ? 'rgba(251,191,36,0.4)' : 'var(--border)',
                          color: on ? 'var(--amber)' : 'var(--t3)',
                          transition:'all 140ms',
                        }}>{p}%</button>
                    )
                  })}
                </div>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
                <Field label="Custom %">
                  <input className="input" type="number" value={discPct} onChange={e => setDiscPct(e.target.value)} placeholder="0-100" />
                </Field>
                <Field label="Expires (optional)">
                  <input className="input" type="date" value={discExpiry} onChange={e => setDiscExpiry(e.target.value)} />
                </Field>
              </div>
              <div style={{ marginTop:12 }}>
                <Field label="Reason" hint="Audited — visible to other admins.">
                  <input className="input" value={discReason} onChange={e => setDiscReason(e.target.value)} placeholder="Loyalty, support credit, promo…" />
                </Field>
              </div>
              <button onClick={applyDiscount} disabled={discSaving} className="btn btn-primary" style={{ width:'100%', marginTop:18, minHeight:42 }}>
                {discSaving ? 'Applying…' : 'Set discount'}
              </button>
            </div>
          </div>

          {/* Grant subscription period */}
          <div className="card-premium" style={{ padding:'24px 28px' }}>
            <SectionTitle icon={<Gift size={15}/>} title="Grant Free Subscription Period" sub={`${SUB_PACKAGES.length} packages available — adds bonus months on top of the current subscription`} />
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {subGroups.map(group => {
                const pkgs = SUB_PACKAGES.filter(p => p.group === group)
                return (
                  <div key={group}>
                    <div style={{
                      fontSize:10.5, fontWeight:800, color:'var(--t4)',
                      textTransform:'uppercase', letterSpacing:'0.13em', marginBottom:10,
                      display:'flex', alignItems:'center', gap:8,
                    }}>
                      <span>{group}</span>
                      <span style={{ flex:1, height:1, background:'var(--border)', opacity:0.5 }} />
                      <span style={{ color:'var(--t3)', letterSpacing:'0.08em' }}>{pkgs.length} {pkgs.length === 1 ? 'package' : 'packages'}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {pkgs.map(pkg => {
                        const on = selSubPkg === pkg.id
                        return (
                          <button key={pkg.id} onClick={() => setSelSubPkg(pkg.id === selSubPkg ? '' : pkg.id)}
                            style={{
                              padding:'10px 16px', borderRadius:999, border:'1px solid', cursor:'pointer',
                              fontSize:12.5, fontWeight:600,
                              background: on ? pkg.color + '1A' : 'var(--surface)',
                              borderColor: on ? pkg.color + '66' : 'var(--border)',
                              color: on ? pkg.color : 'var(--t3)',
                              boxShadow: on ? `0 0 0 3px ${pkg.color}22` : 'none',
                              transition:'all 140ms',
                            }}>{pkg.label}</button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {selSubPkg && (
              <div style={{
                marginTop:20, padding:'18px 20px', borderRadius:14,
                background:'var(--bg2)', border:'1px solid var(--border)',
                display:'flex', gap:14, alignItems:'flex-end', flexWrap:'wrap',
              }}>
                <div style={{ flex:1, minWidth:240 }}>
                  <Field label="Note (optional)" hint="Recorded in audit log + admin notes.">
                    <input className="input" value={subPkgNote} onChange={e => setSubPkgNote(e.target.value)} placeholder="e.g. 'Support gesture', 'Promo LAUNCH2026'" />
                  </Field>
                </div>
                <button onClick={grantSubPackage} disabled={subPkgSaving} className="btn btn-primary" style={{ flexShrink:0, minHeight:42 }}>
                  {subPkgSaving ? 'Granting…' : `Grant ${SUB_PACKAGES.find(p => p.id === selSubPkg)?.label}`}
                </button>
              </div>
            )}
          </div>

          {/* Issue refund */}
          <div className="card-premium" style={{ padding:'24px 28px' }}>
            <SectionTitle icon={<Receipt size={15}/>} title="Issue refund" sub="Refunds an invoice or charge through Stripe — also writes a billing_event entry to the user's timeline." />
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12 }}>
              <Field label="Invoice ID (in_…) or Charge ID (ch_…)">
                <input className="input" value={refundInvoiceOrCharge} onChange={e => setRefundInvoiceOrCharge(e.target.value)} placeholder="in_1Q… or ch_3Q…" style={{ fontFamily:'ui-monospace,monospace', fontSize:12.5 }} />
              </Field>
              <Field label="Amount (€, blank = full)">
                <input className="input" type="number" step="0.01" min="0" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="9.99" />
              </Field>
              <Field label="Reason">
                <select className="input" value={refundReason} onChange={e => setRefundReason(e.target.value)}>
                  <option value="requested_by_customer">Requested by customer</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="fraudulent">Fraudulent</option>
                </select>
              </Field>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18, gap:12 }}>
              <div style={{ fontSize:11.5, color:'var(--t3)' }}>
                Tip: paste the invoice ID from the Payments tab — leaving amount blank refunds the remaining balance.
              </div>
              <button onClick={issueRefund} disabled={refundSaving || !refundInvoiceOrCharge.trim()} className="btn btn-primary" style={{ flexShrink:0, minHeight:42 }}>
                {refundSaving ? 'Refunding…' : 'Issue refund'}
              </button>
            </div>
          </div>

          {/* Override history */}
          <div className="card-premium" style={{ padding:'24px 28px' }}>
            <SectionTitle icon={<History size={15}/>} title="Override History" sub={`${overrides.length} ${overrides.length === 1 ? 'override' : 'overrides'} applied`} />
            {overrides.length === 0 ? (
              <div style={{ padding:'24px 0', textAlign:'center', color:'var(--t3)', fontSize:13 }}>
                No overrides applied yet.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {overrides.map((o:any) => (
                  <div key={o.id} style={{
                    display:'grid',
                    gridTemplateColumns:'auto auto auto auto 1fr auto',
                    gap:14, alignItems:'center',
                    padding:'12px 16px', borderRadius:12,
                    background:'var(--surface)', border:'1px solid var(--border)',
                    fontSize:13,
                  }}>
                    <span className="badge badge-acc">{o.type}</span>
                    {o.plan ? <span className={`badge ${PLAN_META[o.plan]?.badge || 'badge-muted'}`}>{o.plan}</span> : <span style={{ color:'var(--t4)' }}>—</span>}
                    <span style={{ color:'var(--t2)', fontVariantNumeric:'tabular-nums', minWidth:32 }}>{o.months ? `${o.months}mo` : '—'}</span>
                    <span style={{ color:'var(--amber)', fontWeight:600, fontVariantNumeric:'tabular-nums', minWidth:42 }}>{o.discount_pct ? `${o.discount_pct}%` : '—'}</span>
                    <span style={{ color:'var(--t3)', fontSize:12.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.reason || '—'}</span>
                    <span style={{ color:'var(--t4)', fontSize:11.5, fontVariantNumeric:'tabular-nums' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PACKAGES — single big card with a tile grid + a slim history. */}
      {activeTab === 'packages' && (
        <div className="card-premium" style={{ padding:'24px 28px' }}>
          <SectionTitle icon={<Gift size={15}/>} title="Package Grant History" sub={`${packageHistory.length} packages granted to this user`} />
          {packageHistory.length === 0 ? (
            <div style={{ padding:'32px 0', textAlign:'center', color:'var(--t3)', fontSize:13 }}>
              No packages granted yet. Use the Subscription tab to grant a starter / pro / premium package.
            </div>
          ) : (
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',
              gap:12,
            }}>
              {[...packageHistory].reverse().map((h:any, i:number) => (
                <div key={i} style={{
                  padding:'16px 18px', borderRadius:14,
                  background:'var(--surface)', border:'1px solid var(--border)',
                  display:'flex', flexDirection:'column', gap:8,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)', letterSpacing:'-0.005em' }}>
                        {h.label || h.packageId}
                      </div>
                      <div style={{ fontSize:11.5, color:'var(--t4)', marginTop:3 }}>
                        {new Date(h.granted_at).toLocaleString()}
                      </div>
                    </div>
                    {h.plan && <span className={`badge ${PLAN_META[h.plan]?.badge || 'badge-muted'}`}>{h.plan}</span>}
                  </div>
                  <div style={{ display:'flex', gap:14, fontSize:12, color:'var(--t3)', flexWrap:'wrap', fontVariantNumeric:'tabular-nums' }}>
                    {(h.months || h.days) && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                        <Calendar size={11}/> {h.months ? `${h.months} mo` : `${h.days} d`}
                      </span>
                    )}
                    {h.credits > 0 && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:'var(--amber)' }}>
                        <Hash size={11}/> {h.credits} credits
                      </span>
                    )}
                  </div>
                  {h.note && (
                    <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.5, paddingTop:8, borderTop:'1px solid var(--border)', marginTop:4 }}>
                      {h.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREDITS — Adjust panel + Live balance + History list. */}
      {activeTab === 'credits' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:16 }}>

          {/* Adjust */}
          <div className="card-premium" style={{ padding:'24px 28px' }}>
            <SectionTitle icon={<Hash size={15}/>} title="Adjust Credits" sub="Positive to add, negative to deduct" />

            <Field label="Quick grant">
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {CREDIT_PACKAGES.map(cp => {
                  const on = selCreditPkg === cp.id
                  return (
                    <button key={cp.id} onClick={() => { setSelCreditPkg(cp.id); setCreditAmt(String(cp.credits)) }}
                      style={{
                        padding:'8px 14px', borderRadius:999, border:'1px solid', cursor:'pointer',
                        fontSize:12.5, fontWeight:600,
                        background: on ? 'var(--amber-bg)' : 'var(--surface)',
                        borderColor: on ? 'rgba(251,191,36,0.4)' : 'var(--border)',
                        color: on ? 'var(--amber)' : 'var(--t3)',
                        transition:'all 140ms',
                      }}>+ {cp.label}</button>
                  )
                })}
              </div>
            </Field>

            <div style={{ marginTop:14 }}>
              <Field label="Quick deduct">
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[50,100,250,500].map(amt => {
                    const on = creditAmt === String(-amt) && selCreditPkg === `deduct_${amt}`
                    return (
                      <button key={amt} onClick={() => { setSelCreditPkg(`deduct_${amt}`); setCreditAmt(String(-amt)) }}
                        style={{
                          padding:'8px 14px', borderRadius:999, border:'1px solid', cursor:'pointer',
                          fontSize:12.5, fontWeight:600,
                          background: on ? 'var(--red-bg)' : 'var(--surface)',
                          borderColor: on ? 'rgba(248,113,113,0.4)' : 'var(--border)',
                          color: on ? 'var(--red)' : 'var(--t3)',
                          transition:'all 140ms',
                        }}>− {amt}</button>
                    )
                  })}
                </div>
              </Field>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
              <Field label="Custom amount">
                <input className="input" type="number" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} placeholder="e.g. 200 or -50" />
              </Field>
              <Field label="Reason">
                <input className="input" value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Refund, promo, support…" />
              </Field>
            </div>
            <button onClick={applyCredit} disabled={creditSaving} className="btn btn-primary" style={{ width:'100%', marginTop:18, minHeight:42 }}>
              {creditSaving ? 'Applying…' : 'Apply credit adjustment'}
            </button>
          </div>

          {/* Balance + history */}
          <div className="card-premium" style={{ padding:'24px 28px' }}>
            {/* big balance hero */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'18px 20px', borderRadius:14,
              background:'var(--amber-bg)', border:'1px solid rgba(251,191,36,0.25)',
              marginBottom:18,
            }}>
              <div>
                <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.13em', textTransform:'uppercase', color:'var(--amber)', marginBottom:6 }}>Current Balance</div>
                <div style={{ fontSize:36, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.025em', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                  {admin?.credits ?? 0}
                  <span style={{ fontSize:14, color:'var(--t4)', fontWeight:600, marginLeft:6 }}>credits</span>
                </div>
              </div>
              <div style={{
                width:48, height:48, borderRadius:14,
                background:'rgba(251,191,36,0.16)', border:'1px solid rgba(251,191,36,0.4)',
                color:'var(--amber)',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>
                <Hash size={22}/>
              </div>
            </div>

            <SectionTitle icon={<History size={15}/>} title="Credit History" sub={`${creditHistory.length} ${creditHistory.length === 1 ? 'entry' : 'entries'}`} />
            {creditHistory.length === 0 ? (
              <div style={{ padding:'24px 0', textAlign:'center', color:'var(--t3)', fontSize:13 }}>
                No credit history yet.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:380, overflow:'auto' }}>
                {creditHistory.map((c:any) => (
                  <div key={c.id} style={{
                    display:'grid',
                    gridTemplateColumns:'1fr auto auto',
                    gap:14, alignItems:'center',
                    padding:'12px 16px', borderRadius:12,
                    background:'var(--surface)', border:'1px solid var(--border)',
                    fontSize:13,
                  }}>
                    <span style={{ color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.reason || 'Adjustment'}</span>
                    <span style={{
                      color: c.amount > 0 ? 'var(--green)' : 'var(--red)',
                      fontWeight:700, fontVariantNumeric:'tabular-nums',
                    }}>
                      {c.amount > 0 ? '+' : ''}{c.amount}
                    </span>
                    <span style={{ color:'var(--t4)', fontSize:11.5, fontVariantNumeric:'tabular-nums' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TIMELINE — composer card on top, vertical entry feed below. */}
      {activeTab === 'timeline' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card-premium" style={{ padding:'24px 28px' }}>
            <SectionTitle icon={<MessageSquare size={15}/>} title="Add timeline entry" sub="Notes are internal-only. Pin to keep at the top of every admin's view." />
            <Field label="Body">
              <textarea
                rows={3}
                className="input"
                style={{ resize:'vertical', fontFamily:'inherit', lineHeight:1.55 }}
                value={newNoteBody}
                onChange={e => setNewNoteBody(e.target.value)}
                placeholder="Customer called about double-charge; refunded one invoice."
              />
            </Field>
            <div style={{ marginTop:14, display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ flex:'0 0 220px', minWidth:200 }}>
                <Field label="Kind">
                  <select className="input" value={newNoteKind} onChange={e => setNewNoteKind(e.target.value)}>
                    {NOTE_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </Field>
              </div>
              <label style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'10px 14px', borderRadius:999, cursor:'pointer',
                background: newNotePinned ? 'var(--amber-bg)' : 'var(--surface)',
                border: `1px solid ${newNotePinned ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                color: newNotePinned ? 'var(--amber)' : 'var(--t3)',
                fontSize:12.5, fontWeight:600,
                transition:'all 140ms',
              }}>
                <input type="checkbox" checked={newNotePinned} onChange={e => setNewNotePinned(e.target.checked)} style={{ display:'none' }} />
                <Pin size={12}/> {newNotePinned ? 'Will pin' : 'Pin to top'}
              </label>
              <div style={{ flex:1 }} />
              <button onClick={addNote} disabled={noteSaving || !newNoteBody.trim()} className="btn btn-primary" style={{ minHeight:42, padding:'0 22px' }}>
                {noteSaving ? 'Saving…' : 'Add entry'}
              </button>
            </div>
          </div>

          <div className="card-premium" style={{ padding:'24px 28px' }}>
            <SectionTitle icon={<History size={15}/>} title={`Timeline (${timeline.length})`} sub="Notes, billing events, support replies, admin actions — newest first." />
            {timeline.length === 0 ? (
              <div style={{ padding:'32px 0', textAlign:'center', color:'var(--t3)', fontSize:13 }}>
                No timeline entries yet — add a note above or trigger a billing event.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {timeline.map((n: any) => {
                  const meta = NOTE_KINDS.find(k => k.value === n.kind) || NOTE_KINDS[0]
                  return (
                    <div key={n.id} style={{
                      border:'1px solid var(--border)',
                      borderLeft: `4px solid ${n.pinned ? 'var(--amber)' : meta.color}`,
                      borderRadius: 14,
                      padding: '14px 18px',
                      background: n.pinned ? 'rgba(251,191,36,0.06)' : 'var(--surface)',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, fontSize:11, color:'var(--t4)', flexWrap:'wrap' }}>
                        <span style={{
                          padding:'3px 10px', borderRadius:999,
                          background:'var(--bg2)', border:`1px solid ${meta.color}33`,
                          color: meta.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', fontSize:9.5,
                        }}>{meta.label}</span>
                        {n.pinned && (
                          <span style={{
                            padding:'3px 10px', borderRadius:999,
                            background:'var(--amber-bg)', border:'1px solid rgba(251,191,36,0.3)',
                            color:'var(--amber)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', fontSize:9.5,
                            display:'inline-flex', alignItems:'center', gap:4,
                          }}>
                            <Pin size={9}/> pinned
                          </span>
                        )}
                        <span style={{ marginLeft:'auto', color:'var(--t4)' }}>{new Date(n.created_at).toLocaleString()}</span>
                        {n.author && <span style={{ color:'var(--t4)' }}>· {n.author.full_name || n.author.email}</span>}
                      </div>
                      <div style={{ fontSize:13.5, color:'var(--t1)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>{n.body}</div>
                      <div style={{ display:'flex', gap:6, marginTop:12 }}>
                        <button onClick={() => togglePinned(n.id, n.pinned)} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>
                          <Pin size={11}/> {n.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button onClick={() => deleteNote(n.id)} className="btn btn-secondary btn-sm" style={{ fontSize:11, color:'var(--red)' }}>
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

      {/* ACTIVITY — rich session timeline with device / IP / geo. */}
      {activeTab === 'activity' && (() => {
        // Aggregate stats for the strip at the top.
        const distinctCountries = new Set<string>()
        const distinctIps       = new Set<string>()
        const deviceTally: Record<string, number> = {}
        for (const l of loginHistory) {
          if (l.country) distinctCountries.add(l.country)
          if (l.ip)      distinctIps.add(l.ip)
          const d = (l.device_type || 'desktop')
          deviceTally[d] = (deviceTally[d] || 0) + 1
        }
        const topDevice = Object.entries(deviceTally).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
        const last = loginHistory[0]

        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Stats strip */}
            <div className="card-premium" style={{ padding:'20px 24px' }}>
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',
                gap:14,
              }}>
                {[
                  { label:'Sessions',           value: loginHistory.length.toString(),          color:'var(--acc)' },
                  { label:'Countries',          value: distinctCountries.size.toString(),       color:'var(--blue)' },
                  { label:'Unique IPs',         value: distinctIps.size.toString(),             color:'var(--amber)' },
                  { label:'Primary device',     value: topDevice,                                color:'var(--purple)' },
                  { label:'Last sign-in',       value: last ? new Date(last.signed_in_at).toLocaleDateString() : '—', color:'var(--green)' },
                ].map(s => (
                  <div key={s.label} style={{
                    padding:'14px 16px', borderRadius:14,
                    background:'var(--surface)', border:'1px solid var(--border)',
                  }}>
                    <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:'0.13em', textTransform:'uppercase', color:'var(--t4)', marginBottom:6 }}>
                      {s.label}
                    </div>
                    <div style={{
                      fontSize:20, fontWeight:800, color:'var(--t1)',
                      letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums',
                      lineHeight:1, textTransform:s.label === 'Primary device' ? 'capitalize' : undefined,
                    }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="card-premium" style={{ padding:'24px 28px' }}>
              <SectionTitle icon={<LogIn size={15}/>} title="Login History" sub={`Last ${loginHistory.length || 0} sessions — newest first · 90-day retention`} />
              {loginHistory.length === 0 ? (
                <div style={{ padding:'32px 0', textAlign:'center', color:'var(--t3)', fontSize:13 }}>
                  No login history yet. Sessions appear here once the user signs in after the telemetry deploy (2026-05-10).
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {loginHistory.map((l:any) => {
                    const dev = (l.device_type || 'desktop').toLowerCase()
                    const DeviceIcon = dev === 'mobile' ? Smartphone : dev === 'tablet' ? Tablet : dev === 'bot' ? AlertTriangle : Monitor
                    const methodColor =
                      l.method === 'google'         ? '#4285F4' :
                      l.method === 'apple'          ? '#fff'    :
                      l.method === 'magic_link'     ? 'var(--purple)' :
                      l.method === 'admin_password' ? 'var(--red)'    :
                      l.method === 'password'       ? 'var(--acc)'    :
                                                       'var(--t3)'
                    const methodLabel = l.method
                      ? l.method.replace(/_/g, ' ')
                      : 'unknown'
                    const flag = l.country ? countryFlag(l.country) : null
                    return (
                      <div key={l.id} style={{
                        display:'grid',
                        gridTemplateColumns:'auto 1.4fr 1fr auto',
                        gap:18, alignItems:'center',
                        padding:'14px 18px', borderRadius:14,
                        background:'var(--surface)', border:'1px solid var(--border)',
                      }}>
                        {/* Device tile */}
                        <div style={{
                          width:44, height:44, borderRadius:14,
                          background:'var(--bg2)', border:'1px solid var(--border2)',
                          color: l.success === false ? 'var(--red)' : 'var(--t2)',
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          flexShrink:0,
                        }}>
                          <DeviceIcon size={18}/>
                        </div>

                        {/* Identity column — when + where */}
                        <div style={{ minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                            <span style={{
                              fontSize:13.5, fontWeight:700, color:'var(--t1)',
                              fontVariantNumeric:'tabular-nums',
                            }}>{new Date(l.signed_in_at).toLocaleString()}</span>
                            <span style={{
                              fontSize:9.5, fontWeight:800, padding:'2px 8px',
                              borderRadius:999, textTransform:'uppercase', letterSpacing:'0.08em',
                              background:'var(--bg2)', border:`1px solid ${methodColor}33`, color: methodColor,
                            }}>{methodLabel}</span>
                            {l.success === false && (
                              <span style={{
                                fontSize:9.5, fontWeight:800, padding:'2px 8px',
                                borderRadius:999, textTransform:'uppercase', letterSpacing:'0.08em',
                                background:'var(--red-bg)', color:'var(--red)',
                              }}>FAILED</span>
                            )}
                          </div>
                          <div style={{ fontSize:12, color:'var(--t3)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                            {flag && <span style={{ fontSize:14, lineHeight:1 }}>{flag}</span>}
                            <span>{[l.city, l.region, l.country].filter(Boolean).join(', ') || 'location unknown'}</span>
                            {l.timezone && (
                              <>
                                <span style={{ color:'var(--t4)' }}>·</span>
                                <span style={{ fontFamily:'ui-monospace,monospace', fontSize:11 }}>{l.timezone}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Tech column — IP + browser + OS */}
                        <div style={{ minWidth:0 }}>
                          <div style={{
                            fontSize:12, color:'var(--t2)', fontFamily:'ui-monospace,monospace',
                            display:'flex', alignItems:'center', gap:6, marginBottom:4,
                          }}>
                            <Hash size={11}/>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {l.ip || '—'}
                            </span>
                            {l.ip && <CopyBtn text={l.ip}/>}
                          </div>
                          <div style={{ fontSize:11.5, color:'var(--t4)' }}>
                            {[l.browser, l.os].filter(Boolean).join(' · ') || 'unknown UA'}
                          </div>
                        </div>

                        {/* Device-type pill */}
                        <span className="badge badge-muted" style={{
                          fontSize:10.5, padding:'4px 12px',
                          textTransform:'uppercase', letterSpacing:'0.08em',
                          fontWeight:700,
                        }}>{dev}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* SETTINGS — User type + Account status + Danger zone. */}
      {activeTab === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:16 }}>
            {/* User type */}
            <div className="card-premium" style={{ padding:'24px 28px' }}>
              <SectionTitle icon={<Shield size={15}/>} title="User Type" sub="Controls feature flags, test-data visibility, etc." />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10 }}>
                {USER_TYPES.map(ut => {
                  const on = userType === ut.value
                  return (
                    <button key={ut.value} onClick={() => setUserType(ut.value)}
                      style={{
                        padding:'14px 16px', borderRadius:14, border:'1px solid', cursor:'pointer', textAlign:'left',
                        display:'flex', alignItems:'center', gap:12,
                        background: on ? 'var(--acc-bg)' : 'var(--surface)',
                        borderColor: on ? 'var(--acc-border)' : 'var(--border)',
                        boxShadow: on ? '0 0 0 3px var(--acc-bg)' : 'none',
                        transition:'all 160ms',
                      }}>
                      <div style={{
                        width:36, height:36, borderRadius:11, flexShrink:0,
                        background: on ? 'var(--acc-bg)' : 'var(--surface2)',
                        border: `1px solid ${on ? 'var(--acc-border)' : 'var(--border)'}`,
                        color: on ? 'var(--acc)' : 'var(--t3)',
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                      }}>{ut.icon}</div>
                      <div style={{ fontSize:14, fontWeight:700, color: on ? 'var(--acc)' : 'var(--t1)' }}>
                        {ut.label}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Account status */}
            <div className="card-premium" style={{ padding:'24px 28px' }}>
              <SectionTitle icon={<Ban size={15}/>} title="Account Status" sub="Suspended users can't log in; Closed is permanent." />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { value:'active',    label:'Active',    desc:'Full access',                icon:<Unlock size={14}/>,         color:'var(--green)' },
                  { value:'suspended', label:'Suspended', desc:'Login blocked temporarily',  icon:<AlertTriangle size={14}/>,  color:'var(--amber)' },
                  { value:'closed',    label:'Closed',    desc:'Account permanently closed', icon:<Ban size={14}/>,            color:'var(--red)'   },
                ].map(s => {
                  const on = accountStatus === s.value
                  return (
                    <button key={s.value} onClick={() => setAccountStatus(s.value)}
                      style={{
                        padding:'14px 16px', borderRadius:14, border:'1px solid', cursor:'pointer', textAlign:'left',
                        display:'flex', alignItems:'center', gap:12,
                        background: on ? s.color + '14' : 'var(--surface)',
                        borderColor: on ? s.color + '55' : 'var(--border)',
                        boxShadow: on ? `0 0 0 3px ${s.color}22` : 'none',
                        transition:'all 160ms',
                      }}>
                      <span style={{
                        width:36, height:36, borderRadius:11, flexShrink:0,
                        background: on ? s.color + '22' : 'var(--surface2)',
                        border: `1px solid ${on ? s.color + '55' : 'var(--border)'}`,
                        color: s.color,
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                      }}>{s.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color: on ? s.color : 'var(--t1)' }}>{s.label}</div>
                        <div style={{ fontSize:11.5, color:'var(--t4)', marginTop:2 }}>{s.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button onClick={load} className="btn btn-secondary" style={{ minHeight:42, padding:'0 22px' }}>Cancel</button>
            <button onClick={saveSettings} disabled={settingsSaving} className="btn btn-primary" style={{ minHeight:42, padding:'0 22px' }}>
              {settingsSaving ? 'Saving…' : 'Save settings'}
            </button>
          </div>

          {/* Danger zone */}
          <div className="card-premium" style={{
            padding:'24px 28px',
            border:'1px solid rgba(248,113,113,0.45)',
            background:'rgba(248,113,113,0.04)',
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:18 }}>
              <div style={{
                width:44, height:44, borderRadius:14, flexShrink:0,
                background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.4)',
                color:'var(--red)',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 0 24px -4px rgba(248,113,113,0.4)',
              }}>
                <Skull size={20}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  fontSize:11, fontWeight:800, letterSpacing:'0.13em',
                  textTransform:'uppercase', color:'var(--red)', marginBottom:6,
                }}>Danger zone</div>
                <div style={{ fontSize:18, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.015em', marginBottom:8 }}>
                  Permanent account closure
                </div>
                <div style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>
                  GDPR right-to-erasure. Deletes auth user, profile, watchlists, alerts, paper positions, customer notes, and every cascading row. Cancels Stripe subscription. Cannot be undone. Super-admin only.
                </div>
              </div>
            </div>
            {/* Account-takeover response (less destructive than full
                deletion) — freeze + global sign-out + password reset. */}
            <div style={{
              padding:'16px 18px', borderRadius:12, marginBottom:18,
              background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.3)',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:280 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--amber)', marginBottom:4 }}>
                    Account-takeover response (reversible)
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.55 }}>
                    Suspends the account, signs the user out of every device, and emails them a password
                    reset link. Use when the user reports compromise or anomaly detection has flagged
                    repeated high-risk sessions. To unfreeze, set Account Status back to Active.
                  </div>
                </div>
                <button
                  onClick={freezeAccount}
                  disabled={freezeSaving}
                  className="btn"
                  style={{
                    background:'rgba(251,191,36,0.16)',
                    color:'var(--amber)',
                    border:'1px solid rgba(251,191,36,0.5)',
                    fontWeight:700,
                    minHeight:38, padding:'0 18px',
                    display:'inline-flex', alignItems:'center', gap:8,
                    flexShrink:0,
                  }}
                >
                  <AlertTriangle size={14}/>
                  {freezeSaving ? 'Freezing…' : 'Freeze account'}
                </button>
              </div>
            </div>

            <Field label="Reason (recorded in audit log)" required>
              <input className="input" value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="e.g. user requested deletion under GDPR Art. 17" />
            </Field>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:18 }}>
              <button
                onClick={permanentlyClose}
                disabled={closeSaving}
                className="btn"
                style={{
                  background:'rgba(248,113,113,0.14)',
                  color:'var(--red)',
                  border:'1px solid rgba(248,113,113,0.5)',
                  fontWeight:700,
                  minHeight:42, padding:'0 22px',
                  display:'inline-flex', alignItems:'center', gap:8,
                }}
              >
                <Trash2 size={14}/>
                {closeSaving ? 'Closing…' : 'Permanently close & delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
