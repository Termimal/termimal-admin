'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Search, FileText, Pencil } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const STATUS_BADGE: Record<string, string> = {
  Published: 'badge-green',
  Draft:     'badge-amber',
  Scheduled: 'badge-blue',
}

type Article = {
  id: string
  title: string
  status: string
  category: string
  author: string
  published_date: string
}

export default function ContentPage() {
  const supabase = createClient()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    async function fetchArticles() {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setArticles(data)
      setLoading(false)
    }

    fetchArticles()
  }, [supabase])

  const filtered = articles.filter(a => {
    if (statusFilter !== 'All' && a.status !== statusFilter) return false
    if (search.trim() && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const publishedCount = articles.filter(a => a.status === 'Published').length

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<FileText size={28} />}
        eyebrow="CMS"
        title="Content"
        subtitle="Articles, blog posts, and long-form content powering /blog and embedded help."
        metric={{ label: 'Published', value: publishedCount.toString(), secondary: `${articles.length} total` }}
      />

      <Section accent="purple" title="Browse" description="Search and filter the article library.">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search articles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="All">All statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
          </select>
          <Link href="/admin/content/new" className="btn btn-primary btn-sm" style={{ minHeight: 38 }}>
            <Plus size={13} /> New article
          </Link>
        </div>
      </Section>

      {loading ? (
        <Section flush>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Loading articles…</div>
        </Section>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={20}/>}
          title="No articles found"
          description={search || statusFilter !== 'All' ? 'Try clearing the filters.' : 'Create your first article to get started.'}
        >
          <Link href="/admin/content/new" className="btn btn-primary btn-sm">
            <Plus size={13}/> New article
          </Link>
        </EmptyState>
      ) : (
        <Section flush title={`${filtered.length} article${filtered.length === 1 ? '' : 's'}`}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-root" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Title','Category','Author','Status','Date',''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '14px 24px',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--t4)',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--t1)', fontSize: 13 }}>{a.title}</td>
                    <td style={{ padding: '14px 24px', color: 'var(--t3)', fontSize: 13 }}>{a.category}</td>
                    <td style={{ padding: '14px 24px', color: 'var(--t3)', fontSize: 13 }}>{a.author}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <span className={`badge ${STATUS_BADGE[a.status] || 'badge-muted'}`}>{a.status}</span>
                    </td>
                    <td style={{ padding: '14px 24px', color: 'var(--t4)', fontSize: 12, fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
                      {new Date(a.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <Link
                        href={`/admin/content/edit/${a.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        <Pencil size={12} /> Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
