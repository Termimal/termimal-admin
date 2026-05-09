'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function EditArticlePage() {
  const router = useRouter()
  const params = useParams()
  const articleId = params.id as string
  
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    category: 'Education',
    author: 'Editorial',
    status: 'Draft',
    content: '',
    published_date: ''
  })

  useEffect(() => {
    async function fetchArticle() {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single()

      if (error) {
        setError('Could not load article: ' + error.message)
      } else if (data) {
        setFormData({
          title: data.title || '',
          category: data.category || 'Education',
          author: data.author || 'Editorial',
          status: data.status || 'Draft',
          content: data.content || '',
          published_date: data.published_date ? new Date(data.published_date).toISOString().split('T')[0] : ''
        })
      }
      setLoading(false)
    }
    
    if (articleId) fetchArticle()
  }, [articleId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: supabaseError } = await supabase
      .from('articles')
      .update(formData)
      .eq('id', articleId)

    if (supabaseError) {
      setError(supabaseError.message)
      setSaving(false)
    } else {
      router.push('/admin/content')
      router.refresh()
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this article? This cannot be undone.")
    if (!confirmed) return
    
    setSaving(true)
    await supabase.from('articles').delete().eq('id', articleId)
    router.push('/admin/content')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 220, height: 24, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 320, height: 14, borderRadius: 6 }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: '100%', height: 92, borderRadius: 14, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 196, borderRadius: 14, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 360, borderRadius: 14 }} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/content" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} style={{ color: 'var(--t2)' }} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Edit Article</h1>
            <p className="text-sm" style={{ color: 'var(--t3)' }}>Update content or change publication status.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6" role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Article Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e: any) => setFormData({...formData, title: e.target.value})}
            className="input"
            style={{ fontSize: '1.05rem', fontWeight: 500 }}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Category</label>
            <select
              value={formData.category}
              onChange={(e: any) => setFormData({...formData, category: e.target.value})}
              className="input"
            >
              <option>Education</option>
              <option>Analysis</option>
              <option>Product</option>
              <option>News</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Status</label>
            <select
              value={formData.status}
              onChange={(e: any) => setFormData({...formData, status: e.target.value})}
              className="input"
            >
              <option>Draft</option>
              <option>Published</option>
              <option>Scheduled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Author</label>
            <input
              type="text"
              required
              value={formData.author}
              onChange={(e: any) => setFormData({...formData, author: e.target.value})}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Publish Date</label>
            <input
              type="date"
              required
              value={formData.published_date}
              onChange={(e: any) => setFormData({...formData, published_date: e.target.value})}
              className="input"
            />
          </div>
        </div>

        <div className="p-6 rounded-xl border flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)', minHeight: '500px' }}>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium" style={{ color: 'var(--t2)' }}>Article Content</label>
            <span className="text-xs font-mono" style={{ color: 'var(--t3)' }}>Markdown supported</span>
          </div>
          <textarea
            required
            value={formData.content}
            onChange={(e: any) => setFormData({...formData, content: e.target.value})}
            className="input"
            style={{ flex: 1, resize: 'none', lineHeight: 1.6, minHeight: 360 }}
          />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 border-t flex justify-end z-10 lg:pl-64" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', backdropFilter: 'blur(8px)' }}>
          <div className="max-w-4xl w-full mx-auto flex justify-between items-center">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="btn btn-danger"
              style={{ minHeight: 40 }}
            >
              <Trash2 size={16} style={{ flexShrink: 0 }} />
              Delete article
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ minHeight: 40 }}
            >
              <Save size={16} style={{ flexShrink: 0 }} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}


