'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react'

type FAQ = {
  id: string
  question: string
  answer: string
  is_active: boolean
}

export default function FAQEditor() {
  const supabase = createClient()
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ question: '', answer: '', is_active: true })

  useEffect(() => {
    fetchFaqs()
  }, [supabase])

  async function fetchFaqs() {
    const { data } = await supabase.from('faqs').select('*').order('created_at', { ascending: true })
    if (data) setFaqs(data)
    setLoading(false)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (editingId) {
      const { error: err } = await supabase.from('faqs').update(formData).eq('id', editingId)
      if (err) setError(err.message)
    } else {
      const { error: err } = await supabase.from('faqs').insert([formData])
      if (err) setError(err.message)
    }

    setSaving(false)
    if (!error) {
      resetForm()
      fetchFaqs()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return
    await supabase.from('faqs').delete().eq('id', id)
    fetchFaqs()
  }

  const startEditing = (faq: FAQ) => {
    setEditingId(faq.id)
    setFormData({ question: faq.question, answer: faq.answer, is_active: faq.is_active })
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({ question: '', answer: '', is_active: true })
    setError('')
  }

  if (loading) return <div className="p-8 text-sm animate-pulse" style={{ color: 'var(--t3)' }}>Loading FAQs...</div>

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">FAQ Management</h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Add, update, or remove Frequently Asked Questions from your site.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: The Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="p-6 rounded-xl border sticky top-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="font-bold text-lg mb-4 flex items-center justify-between">
              {editingId ? 'Edit FAQ' : 'Add New FAQ'}
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs font-normal flex items-center gap-1 hover:underline" style={{ color: 'var(--t3)' }}>
                  <X size={12} /> Cancel Edit
                </button>
              )}
            </h2>

            {error && <div className="mb-4 p-3 rounded text-xs text-red-500 bg-red-500/10">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Question</label>
                <input 
                  type="text" required
                  value={formData.question}
                  onChange={(e: any) => setFormData({...formData, question: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                  placeholder="e.g. How much does it cost?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Answer</label>
                <textarea 
                  required rows={4}
                  value={formData.answer}
                  onChange={(e: any) => setFormData({...formData, answer: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                  placeholder="Write the answer here..."
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--t2)' }}>
                <input 
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e: any) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded border-gray-300"
                />
                Visible on public site
              </label>

               <button 
                type="submit" disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 mt-2"
                style={{ background: 'var(--acc)', color: 'white' }}
              >
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {saving ? 'Saving...' : editingId ? 'Update FAQ' : 'Create FAQ'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: The List */}
        <div className="lg:col-span-2 space-y-4">
          {faqs.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}>
              No FAQs created yet. Use the form to add your first one!
            </div>
          ) : (
            faqs.map((faq) => (
              <div key={faq.id} className="p-5 rounded-xl border group transition-all" style={{ 
                borderColor: editingId === faq.id ? 'var(--acc)' : 'var(--border)', 
                background: 'var(--surface)',
                opacity: faq.is_active ? 1 : 0.6
              }}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-base mb-1" style={{ color: 'var(--t1)' }}>{faq.question}</h3>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--t3)' }}>{faq.answer}</p>
                    
                    {!faq.is_active && (
                      <span className="inline-block mt-3 text-[0.65rem] font-bold px-2 py-0.5 rounded bg-gray-500/10 text-gray-500">HIDDEN</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => startEditing(faq)} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--t2)' }}>
                      <Edit2 size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(faq.id)} className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
