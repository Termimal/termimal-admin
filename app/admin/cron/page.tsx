'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/cron — scheduled background jobs and their run history.
 *
 * Reads from pg_cron (via admin_cron_jobs / admin_cron_runs RPCs).
 * Shows for each job: schedule (cron expression), last status, last
 * run time, 14-day success vs failure counts, and the SQL command.
 *
 * Click a row to expand recent run history (last 100 entries) so you
 * can spot a job that just started failing without paging through
 * Supabase's SQL editor.
 *
 * This is a READ-ONLY viewer. Adding / editing schedules is still done
 * via Supabase migrations — that's intentional, we want every schedule
 * change to land in version control.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Clock, CheckCircle2, XCircle, RefreshCw, ChevronDown, Activity,
  AlertTriangle, Calendar,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Job {
  jobid:         number
  jobname:       string
  schedule:      string
  command:       string
  database:      string
  active:        boolean
  last_runid:    number | null
  last_status:   string | null
  last_message:  string | null
  last_start:    string | null
  last_end:      string | null
  succeeded_14d: number
  failed_14d:    number
}

interface Run {
  runid:          number
  jobid:          number
  jobname:        string
  status:         string
  return_message: string | null
  start_time:     string
  end_time:       string | null
  duration_ms:    number | null
}

function describeSchedule(cron: string): string {
  // Friendly description for the common cases (we don't need a full parser).
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return cron
  const [min, hour, dom, mon, dow] = parts
  if (dom === '*' && mon === '*' && dow === '*') {
    if (hour === '*' && min === '*') return 'Every minute'
    if (hour === '*') return `Every hour at :${min.padStart(2, '0')}`
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`
  }
  if (dom === '*' && mon === '*' && dow !== '*') {
    return `Weekly (DOW ${dow}) at ${hour}:${min.padStart(2, '0')} UTC`
  }
  return cron
}

export default function CronPage() {
  const [jobs, setJobs]       = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')
  const [openId, setOpenId]   = useState<number | null>(null)
  const [runsByJob, setRunsByJob] = useState<Record<number, Run[]>>({})

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/cron', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setJobs(j.jobs || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const summary = useMemo(() => {
    let active = 0, failed = 0, succeeded = 0
    for (const j of jobs) {
      if (j.active) active++
      succeeded += j.succeeded_14d
      failed    += j.failed_14d
    }
    return { active, failed, succeeded, total: jobs.length }
  }, [jobs])

  const openJob = async (jobid: number) => {
    if (openId === jobid) { setOpenId(null); return }
    setOpenId(jobid)
    if (runsByJob[jobid]) return
    try {
      const res = await fetch(`/api/admin/cron?runs=1&jobid=${jobid}&limit=50`, { cache: 'no-store' })
      const j = await res.json()
      if (res.ok) setRunsByJob(prev => ({ ...prev, [jobid]: j.runs || [] }))
    } catch { /* swallow */ }
  }

  return (
    <div>
      <HeroCard
        accent="green"
        icon={<Clock size={28}/>}
        eyebrow="Infrastructure"
        title="Scheduled jobs"
        subtitle="pg_cron-backed background tasks. Retention pruners, email-log cleanups, scheduled exports. Click any row to inspect the last 50 runs and spot failures."
        metric={{
          label: 'Active',
          value: `${summary.active} / ${summary.total}`,
          secondary: summary.failed > 0
            ? `${summary.failed} failures (14d)`
            : `${summary.succeeded} successes (14d)`,
        }}
      />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <p style={{ fontSize:12.5, color:'var(--t3)', margin:0, maxWidth:640 }}>
          Schedules are managed via Supabase migrations so every change is auditable in git. Editing is intentionally not exposed here.
        </p>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:36 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Section accent="green" title="Scheduled jobs" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${jobs.length} scheduled · ${summary.succeeded} ok / ${summary.failed} failed (14d)`}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }} />
            ))}
          </div>
        ) : err ? (
          <EmptyState
            icon={<AlertTriangle size={20}/>}
            title="Couldn't load cron jobs"
            description={err}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Calendar size={20}/>}
            title="No scheduled jobs"
            description="Either pg_cron isn't installed or no jobs are registered. Check the supabase/migrations folder."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {jobs.map(j => {
              const isOpen = openId === j.jobid
              const isOk   = j.last_status === 'succeeded'
              const isFail = j.last_status && j.last_status !== 'succeeded'
              const runs   = runsByJob[j.jobid]
              return (
                <div key={j.jobid} className="card-premium" style={{
                  padding:'14px 18px',
                  borderColor: isFail ? 'rgba(248,113,113,0.3)' : 'var(--border)',
                  cursor:'pointer',
                }} onClick={() => openJob(j.jobid)}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <span style={{
                      width:36, height:36, borderRadius:11, flexShrink:0,
                      background: isFail ? 'rgba(248,113,113,0.12)' : 'rgba(63,185,80,0.12)',
                      color:      isFail ? 'var(--red)' : 'var(--green-val)',
                      border: `1px solid ${isFail ? 'rgba(248,113,113,0.3)' : 'rgba(63,185,80,0.3)'}`,
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {isFail ? <XCircle size={15}/> : isOk ? <CheckCircle2 size={15}/> : <Activity size={15}/>}
                    </span>
                    <div style={{ flex:1, minWidth:260 }}>
                      <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{j.jobname}</div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'monospace' }}>{j.schedule}</span>
                        <span>·</span>
                        <span>{describeSchedule(j.schedule)}</span>
                        <span>·</span>
                        <span>db: {j.database}</span>
                      </div>
                    </div>
                    {/* 14-day mini stats */}
                    <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:11.5 }}>
                      <span style={{
                        padding:'4px 10px', borderRadius:999,
                        background:'rgba(63,185,80,0.12)', color:'var(--green-val)',
                        border:'1px solid rgba(63,185,80,0.3)',
                        fontWeight:700,
                      }}>
                        {j.succeeded_14d} ok
                      </span>
                      {j.failed_14d > 0 && (
                        <span style={{
                          padding:'4px 10px', borderRadius:999,
                          background:'rgba(248,113,113,0.14)', color:'var(--red)',
                          border:'1px solid rgba(248,113,113,0.4)',
                          fontWeight:700,
                        }}>
                          {j.failed_14d} failed
                        </span>
                      )}
                      {!j.active && (
                        <span style={{
                          padding:'4px 10px', borderRadius:999,
                          background:'var(--bg3)', color:'var(--t4)',
                          border:'1px solid var(--border)',
                          fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', fontSize:10,
                        }}>Paused</span>
                      )}
                    </div>
                    <ChevronDown size={14} style={{ color:'var(--t4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 160ms' }}/>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'8px 14px', fontSize:12, marginBottom:14 }}>
                        <span style={{ color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.05em', fontSize:10.5 }}>Last run</span>
                        <span style={{ color:'var(--t2)' }}>
                          {j.last_start ? new Date(j.last_start).toLocaleString() : '—'}
                          {j.last_status && <span style={{ marginLeft:10, color: isFail ? 'var(--red)' : 'var(--green-val)', fontWeight:700 }}>{j.last_status}</span>}
                          {j.last_message && <span style={{ marginLeft:10, color:'var(--t3)' }}>· {j.last_message}</span>}
                        </span>
                        <span style={{ color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.05em', fontSize:10.5 }}>Command</span>
                        <pre style={{
                          margin:0, padding:'8px 10px', borderRadius:8,
                          background:'var(--bg)', border:'1px solid var(--border)',
                          fontSize:11, fontFamily:'ui-monospace, Menlo, monospace',
                          color:'var(--t2)', overflow:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word',
                        }}>{j.command}</pre>
                      </div>

                      <div style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', marginBottom:8 }}>
                        Run history {runs ? `(${runs.length})` : '(loading…)'}
                      </div>
                      {!runs ? (
                        <div className="skeleton" style={{ height:120, borderRadius:10 }}/>
                      ) : runs.length === 0 ? (
                        <div style={{ fontSize:12, color:'var(--t4)' }}>No runs recorded yet.</div>
                      ) : (
                        <div style={{
                          maxHeight:280, overflow:'auto', borderRadius:10,
                          border:'1px solid var(--border)', background:'var(--bg)',
                        }}>
                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
                            <thead>
                              <tr style={{ background:'var(--bg3)', textAlign:'left' }}>
                                <th style={{ padding:'8px 12px', color:'var(--t4)', textTransform:'uppercase', fontSize:10, letterSpacing:'0.05em' }}>Start</th>
                                <th style={{ padding:'8px 12px', color:'var(--t4)', textTransform:'uppercase', fontSize:10, letterSpacing:'0.05em' }}>Status</th>
                                <th style={{ padding:'8px 12px', color:'var(--t4)', textTransform:'uppercase', fontSize:10, letterSpacing:'0.05em' }}>Took</th>
                                <th style={{ padding:'8px 12px', color:'var(--t4)', textTransform:'uppercase', fontSize:10, letterSpacing:'0.05em' }}>Message</th>
                              </tr>
                            </thead>
                            <tbody>
                              {runs.map(r => {
                                const fail = r.status !== 'succeeded'
                                return (
                                  <tr key={r.runid} style={{ borderTop:'1px solid var(--border)' }}>
                                    <td style={{ padding:'8px 12px', color:'var(--t2)', fontFamily:'monospace' }}>{new Date(r.start_time).toLocaleString()}</td>
                                    <td style={{ padding:'8px 12px', color: fail ? 'var(--red)' : 'var(--green-val)', fontWeight:700 }}>{r.status}</td>
                                    <td style={{ padding:'8px 12px', color:'var(--t3)' }}>{r.duration_ms != null ? `${r.duration_ms} ms` : '—'}</td>
                                    <td style={{ padding:'8px 12px', color:'var(--t3)', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.return_message ?? ''}>
                                      {r.return_message ?? '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
