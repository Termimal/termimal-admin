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
    return <div className="animate-pulse text-sm p-8" style={{ color: 'var(--t3)' }}>Loading article data...</div>
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
        <div className="mb-6 p-4 rounded-lg text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>
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
            className="w-full px-4 py-3 rounded-lg text-lg font-medium outline-none transition-colors"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Category</label>
            <select 
              value={formData.category}
              onChange={(e: any) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
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
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
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
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Publish Date</label>
            <input 
              type="date" 
              required
              value={formData.published_date}
              onChange={(e: any) => setFormData({...formData, published_date: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            />
          </div>
        </div>

        <div className="p-6 rounded-xl border flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)', minHeight: '500px' }}>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium" style={{ color: 'var(--t2)' }}>Article Content</label>
            <span className="text-xs font-mono" style={{ color: 'var(--t4)' }}>Markdown supported</span>
          </div>
          <textarea 
            required
            value={formData.content}
            onChange={(e: any) => setFormData({...formData, content: e.target.value})}
            className="w-full flex-1 p-4 rounded-lg text-sm outline-none resize-none transition-colors"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)', lineHeight: '1.6' }}
          />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 border-t flex justify-end z-10 lg:pl-64" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="max-w-4xl w-full mx-auto flex justify-between items-center">
            <button 
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center gap-2 hover:bg-red-500/10 text-red-500"
            >
              <Trash2 size={16} />
              Delete Article
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center gap-2"
              style={{ background: 'var(--acc)', color: 'white' }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}


