'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewArticlePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    category: 'Education',
    author: 'Editorial',
    status: 'Draft',
    content: '', // <-- Added content field here
    published_date: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: supabaseError } = await supabase
      .from('articles')
      .insert([formData])

    if (supabaseError) {
      setError(supabaseError.message)
      setSaving(false)
    } else {
      router.push('/admin/content')
      router.refresh()
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/content" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} style={{ color: 'var(--t2)' }} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Create Article</h1>
            <p className="text-sm" style={{ color: 'var(--t3)' }}>Draft a new report or market analysis.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6" role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
        <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Article Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g. Weekly Macro Brief: Fed Holds, VIX Spikes"
            className="input"
            style={{ fontSize: '1.05rem', fontWeight: 500 }}
          />
        </div>

        {/* Metadata Grid */}
        <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
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
              onChange={(e) => setFormData({...formData, status: e.target.value})}
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
              onChange={(e) => setFormData({...formData, author: e.target.value})}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Publish Date</label>
            <input
              type="date"
              required
              value={formData.published_date}
              onChange={(e) => setFormData({...formData, published_date: e.target.value})}
              className="input"
            />
          </div>
        </div>

        {/* Content Writer (NEW) */}
        <div className="p-6 rounded-xl border flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)', minHeight: '500px' }}>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium" style={{ color: 'var(--t2)' }}>Article Content</label>
            <span className="text-xs font-mono" style={{ color: 'var(--t3)' }}>Markdown supported</span>
          </div>

          <textarea
            required
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            placeholder="Write your article here... You can use standard Markdown formatting."
            className="input"
            style={{ flex: 1, resize: 'none', lineHeight: 1.6, minHeight: 360 }}
          />
        </div>

        {/* Fixed Save Bar at the bottom of the screen */}
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t flex justify-end z-10 lg:pl-64" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', backdropFilter: 'blur(8px)' }}>
          <div className="max-w-4xl w-full mx-auto flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ minHeight: 40 }}
            >
              <Save size={16} style={{ flexShrink: 0 }} />
              {saving ? 'Publishing…' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}