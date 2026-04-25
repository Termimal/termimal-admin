'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react'

type FAQ = {
  id: string
  question: string
  answer: string
  isactive: boolean
  createdat?: string | null
}

type FAQForm = {
  question: string
  answer: string
  isactive: boolean
}

export default function FAQEditor() {
  const supabase = createClient()

  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FAQForm>({
    question: '',
    answer: '',
    isactive: true,
  })

  useEffect(() => {
    fetchFaqs()
  }, [])

  async function fetchFaqs() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('faqs')
      .select('id, question, answer, isactive, createdat')
      .order('createdat', { ascending: true })

    if (error) {
      setError(error.message)
      setFaqs([])
    } else {
      setFaqs((data as FAQ[]) || [])
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      isactive: formData.isactive,
    }

    if (!payload.question || !payload.answer) {
      setError('Question and answer are required.')
      setSaving(false)
      return
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from('faqs')
        .update(payload)
        .eq('id', editingId)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }

      setSuccess('FAQ updated successfully.')
    } else {
      const { error: insertError } = await supabase.from('faqs').insert([payload])

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }

      setSuccess('FAQ created successfully.')
    }

    resetForm(false)
    await fetchFaqs()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this FAQ?')
    if (!confirmed) return

    setError('')
    setSuccess('')

    const { error } = await supabase.from('faqs').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    if (editingId === id) {
      resetForm(false)
    }

    setSuccess('FAQ deleted successfully.')
    await fetchFaqs()
  }

  const startEditing = (faq: FAQ) => {
    setEditingId(faq.id)
    setError('')
    setSuccess('')
    setFormData({
      question: faq.question,
      answer: faq.answer,
      isactive: faq.isactive,
    })
  }

  const resetForm = (clearMessages = true) => {
    setEditingId(null)
    setFormData({
      question: '',
      answer: '',
      isactive: true,
    })

    if (clearMessages) {
      setError('')
      setSuccess('')
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm animate-pulse" style={{ color: 'var(--t3)' }}>
        Loading FAQs...
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
          FAQ Management
        </h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          Add, update, or remove frequently asked questions from your site.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-xl border sticky top-6"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <h2 className="font-bold text-lg mb-4 flex items-center justify-between">
              {editingId ? 'Edit FAQ' : 'Add New FAQ'}

              {editingId && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="text-xs font-normal flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--t3)' }}
                >
                  <X size={12} />
                  Cancel edit
                </button>
              )}
            </h2>

            {error ? (
              <div
                className="mb-4 p-3 rounded text-xs"
                style={{ color: 'var(--red-val)', background: 'rgba(248,113,113,.1)' }}
              >
                {error}
              </div>
            ) : null}

            {success ? (
              <div
                className="mb-4 p-3 rounded text-xs"
                style={{ color: 'var(--green-val)', background: 'rgba(52,211,153,.1)' }}
              >
                {success}
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>
                  Question
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      question: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--t1)',
                  }}
                  placeholder="e.g. How much does it cost?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>
                  Answer
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      answer: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--t1)',
                  }}
                  placeholder="Write the answer here..."
                />
              </div>

              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: 'var(--t2)' }}
              >
                <input
                  type="checkbox"
                  checked={formData.isactive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isactive: e.target.checked,
                    }))
                  }
                />
                Visible on public site
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 mt-2"
                style={{ background: 'var(--acc)', color: 'white' }}
              >
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {saving ? 'Saving...' : editingId ? 'Update FAQ' : 'Create FAQ'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {faqs.length === 0 ? (
            <div
              className="p-8 text-center rounded-xl border border-dashed"
              style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}
            >
              No FAQs created yet. Use the form to add your first one.
            </div>
          ) : (
            faqs.map((faq) => (
              <div
                key={faq.id}
                className="p-5 rounded-xl border group transition-all"
                style={{
                  borderColor: editingId === faq.id ? 'var(--acc)' : 'var(--border)',
                  background: 'var(--surface)',
                  opacity: faq.isactive ? 1 : 0.6,
                }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base mb-1" style={{ color: 'var(--t1)' }}>
                      {faq.question}
                    </h3>

                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--t3)' }}>
                      {faq.answer}
                    </p>

                    {!faq.isactive ? (
                      <span
                        className="inline-block mt-3 text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: 'rgba(148,163,184,.12)',
                          color: 'var(--t3)',
                        }}
                      >
                        HIDDEN
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(faq)}
                      className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: 'var(--t2)' }}
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(faq.id)}
                      className="p-1.5 rounded hover:bg-red-500/10"
                      style={{ color: 'var(--red-val)' }}
                    >
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