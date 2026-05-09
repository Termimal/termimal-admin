'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, X, Save, HelpCircle } from 'lucide-react'

import { HeroCard, Section, Field, EmptyState } from '@/components/admin/PageChrome'

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

  const activeCount = faqs.filter(f => f.is_active).length

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<HelpCircle size={28} />}
        eyebrow="Support"
        title="FAQs"
        subtitle="Frequently asked questions surfaced on /help and the support widget."
        metric={{ label: 'Visible', value: activeCount.toString(), secondary: `${faqs.length} total` }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div>
          <Section
            accent="purple"
            title={editingId ? 'Edit FAQ' : 'Add new FAQ'}
            description="Questions appear in order of creation on the public help center."
            actions={editingId && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
                <X size={12}/> Cancel
              </button>
            )}
          >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {error && (
                <div style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
                  color: 'var(--red)', fontSize: 13, fontWeight: 600,
                }}>{error}</div>
              )}

              <Field label="Question" required>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.question}
                  onChange={(e: any) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How much does it cost?"
                />
              </Field>

              <Field label="Answer" required>
                <textarea
                  required
                  rows={5}
                  className="input"
                  value={formData.answer}
                  onChange={(e: any) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Write the answer here…"
                  style={{ resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit' }}
                />
              </Field>

              <Field label="Visibility">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e: any) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--acc)' }}
                  />
                  Visible on public site
                </label>
              </Field>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-sm"
                style={{ minHeight: 38 }}
              >
                {editingId ? <Save size={13}/> : <Plus size={13}/>}
                {saving ? 'Saving…' : editingId ? 'Update FAQ' : 'Create FAQ'}
              </button>
            </form>
          </Section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <Section flush>
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Loading FAQs…</div>
            </Section>
          ) : faqs.length === 0 ? (
            <EmptyState
              icon={<HelpCircle size={20}/>}
              title="No FAQs yet"
              description="Use the form to add your first one."
            />
          ) : (
            faqs.map((faq) => (
              <div key={faq.id} className="card-premium" style={{
                padding: '24px 28px',
                borderColor: editingId === faq.id ? 'var(--purple)44' : 'var(--border)',
                opacity: faq.is_active ? 1 : 0.65,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 8, letterSpacing: '-0.005em' }}>{faq.question}</h3>
                    <p style={{ fontSize: 13, color: 'var(--t3)', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{faq.answer}</p>
                    {!faq.is_active && (
                      <span className="badge badge-muted" style={{ marginTop: 12 }}>Hidden</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEditing(faq)}>
                      <Edit2 size={12}/>
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDelete(faq.id)} style={{ color: 'var(--red)' }}>
                      <Trash2 size={12}/>
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
