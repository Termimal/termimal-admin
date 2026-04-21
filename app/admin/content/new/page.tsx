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
    published_date: new Date().toISOString().split('T')[0] // Sets today's date formatted as YYYY-MM-DD
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
      // Success! Send the user back to the content list
      router.push('/admin/content')
      router.refresh() // Refreshes the layout to show the new article instantly
    }
  }

  return (
    <div className="max-w-3xl">
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
        <div className="mb-6 p-4 rounded-lg text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>
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
            className="w-full px-4 py-3 rounded-lg text-lg font-medium outline-none transition-colors"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
        </div>

        {/* Metadata Grid */}
        <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
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
              onChange={(e) => setFormData({...formData, status: e.target.value})}
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
              onChange={(e) => setFormData({...formData, author: e.target.value})}
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
              onChange={(e) => setFormData({...formData, published_date: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={saving}
            className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--acc)', color: 'white' }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Article'}
          </button>
        </div>
      </form>
    </div>
  )
}