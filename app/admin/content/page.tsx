'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const statusStyle: Record<string, { color: string; bg: string }> = {
  Published: { color: 'var(--green-val)', bg: 'rgba(52,211,153,.1)' },
  Draft: { color: 'var(--amber)', bg: 'rgba(251,191,36,.1)' },
  Scheduled: { color: 'var(--blue)', bg: 'rgba(96,165,250,.1)' },
}

// Define the type for our database row
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
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Search size={14} style={{ color: 'var(--t4)' }} />
          <input placeholder="Search articles..." className="bg-transparent outline-none text-[0.78rem] w-full" style={{ color: 'var(--t1)' }} />
        </div>
        <select className="px-3 py-2 rounded-lg text-[0.72rem]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}>
          <option>All statuses</option>
          <option>Published</option>
          <option>Draft</option>
          <option>Scheduled</option>
        </select>
        
        {/* NEW ARTICLE BUTTON */}
        <Link 
          href="/admin/content/new"
          className="text-[0.72rem] py-2 px-4 flex items-center justify-center gap-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--acc)', color: 'white' }}
        >
          <Plus size={14} /> New article
        </Link>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {['Title','Category','Author','Status','Date',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>
                  Loading articles...
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>
                  No articles found.
                </td>
              </tr>
            ) : (
              articles.map(a => (
                <tr key={a.id} className="transition-colors hover:opacity-80" style={{ background: 'var(--bg)' }}>
                  <td className="px-4 py-2.5 font-semibold">{a.title}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{a.category}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{a.author}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ 
                      color: statusStyle[a.status]?.color || 'var(--t2)', 
                      background: statusStyle[a.status]?.bg || 'var(--border)' 
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--t4)' }}>
                    {new Date(a.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  
                  {/* EDIT ARTICLE BUTTON */}
                  <td className="px-4 py-2.5 text-right">
                    <Link 
                      href={`/admin/content/edit/${a.id}`} 
                      className="text-[0.68rem] font-medium hover:underline" 
                      style={{ color: 'var(--acc)' }}
                    >
                      Edit
                    </Link>
                  </td>
                  
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}