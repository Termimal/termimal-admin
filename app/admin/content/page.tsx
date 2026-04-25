'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const statusStyle: Record<string, { color: string; bg: string }> = {
  published: { color: 'var(--green-val)', bg: 'rgba(52,211,153,.1)' },
  draft: { color: 'var(--amber)', bg: 'rgba(251,191,36,.1)' },
  scheduled: { color: 'var(--blue)', bg: 'rgba(96,165,250,.1)' },
  archived: { color: 'var(--t3)', bg: 'rgba(148,163,184,.12)' },
}

type ArticleRow = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'scheduled' | 'archived' | string
  category: string | null
  content: string | null
  excerpt: string | null
  createdat: string | null
  updatedat: string | null
  publishedat: string | null
  scheduledat: string | null
  authorid: string | null
  profiles?: {
    fullname: string | null
    email: string | null
  } | null
}

const STATUS_OPTIONS = ['all', 'published', 'draft', 'scheduled', 'archived']

function formatStatus(status: string) {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ContentPage() {
  const supabase = createClient()

  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true)
      setError('')

      let query = supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          status,
          category,
          content,
          excerpt,
          createdat,
          updatedat,
          publishedat,
          scheduledat,
          authorid,
          profiles:authorid (
            fullname,
            email
          )
        `)
        .order('createdat', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
        setArticles([])
      } else {
        setArticles((data as ArticleRow[]) || [])
      }

      setLoading(false)
    }

    fetchArticles()
  }, [supabase, statusFilter])

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return articles

    return articles.filter((a) =>
      [
        a.title,
        a.slug,
        a.category,
        a.status,
        a.content,
        a.excerpt,
        a.profiles?.fullname,
        a.profiles?.email,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [articles, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <h1 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          Content
        </h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          Manage articles, publishing states, and editorial updates.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <Search size={14} style={{ color: 'var(--t4)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles, author, category, slug..."
            className="bg-transparent outline-none text-sm w-full"
            style={{ color: 'var(--t1)' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'All statuses' : formatStatus(status)}
            </option>
          ))}
        </select>

        <Link
          href="/admin/content/new"
          className="text-sm py-2 px-4 flex items-center justify-center gap-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--acc)', color: 'white' }}
        >
          <Plus size={14} />
          New article
        </Link>
      </div>

      {error ? (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}
        >
          Failed to load articles: {error}
        </div>
      ) : null}

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {['Title', 'Category', 'Author', 'Status', 'Publish date', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--t4)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>
                  Loading articles...
                </td>
              </tr>
            ) : filteredArticles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>
                  No articles found.
                </td>
              </tr>
            ) : (
              filteredArticles.map((a) => {
                const authorLabel =
                  a.profiles?.fullname?.trim() ||
                  a.profiles?.email?.trim() ||
                  (a.authorid ? `${a.authorid.slice(0, 8)}...` : '—')

                const displayDate =
                  a.status === 'published'
                    ? a.publishedat
                    : a.status === 'scheduled'
                    ? a.scheduledat
                    : a.createdat

                return (
                  <tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="font-semibold" style={{ color: 'var(--t1)' }}>
                        {a.title}
                      </div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--t4)' }}>
                        /{a.slug}
                      </div>
                    </td>

                    <td className="px-4 py-3" style={{ color: 'var(--t3)' }}>
                      {a.category || '—'}
                    </td>

                    <td className="px-4 py-3" style={{ color: 'var(--t3)' }}>
                      {authorLabel}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-1 rounded"
                        style={{
                          color: statusStyle[a.status]?.color || 'var(--t2)',
                          background: statusStyle[a.status]?.bg || 'var(--border)',
                        }}
                      >
                        {formatStatus(a.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--t4)' }}>
                      {formatDate(displayDate)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/content/edit/${a.id}`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: 'var(--acc)' }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}