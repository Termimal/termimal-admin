'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminSEO() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  
  const [settings, setSettings] = useState({
    site_title: '',
    site_description: '',
    site_keywords: '',
    og_image: ''
  })

  // Load the current SEO settings when the page loads
  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'global')
        .single()
        
      if (data) setSettings(data)
      setLoading(false)
    }
    loadSettings()
  }, [supabase])

  // Save the updated settings back to Supabase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', type: '' })

    const { error } = await supabase
      .from('site_settings')
      .update({
        site_title: settings.site_title,
        site_description: settings.site_description,
        site_keywords: settings.site_keywords,
        og_image: settings.og_image,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'global')

    if (error) {
      setMessage({ text: 'Error saving settings: ' + error.message, type: 'error' })
    } else {
      setMessage({ text: 'SEO settings updated successfully!', type: 'success' })
    }
    
    setSaving(false)
    
    // Clear success message after 3 seconds
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  if (loading) return <div className="animate-pulse text-sm" style={{ color: 'var(--t3)' }}>Loading settings...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">SEO Settings</h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Manage how your site appears on Google and social media.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        
        {/* Site Title */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>
            Global Site Title
          </label>
          <input 
            type="text" 
            value={settings.site_title}
            onChange={(e) => setSettings({...settings, site_title: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            required
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--t4)' }}>Keep it under 60 characters for best Google display.</p>
        </div>

        {/* Site Description */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>
            Meta Description
          </label>
          <textarea 
            value={settings.site_description}
            onChange={(e) => setSettings({...settings, site_description: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors min-h-[100px] resize-y"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            required
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--t4)' }}>Keep it between 150-160 characters. This appears below your link on search engines.</p>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>
            Keywords (comma separated)
          </label>
          <input 
            type="text" 
            value={settings.site_keywords}
            onChange={(e) => setSettings({...settings, site_keywords: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
        </div>

        {/* OG Image */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>
            OpenGraph Image URL
          </label>
          <input 
            type="text" 
            value={settings.og_image}
            onChange={(e) => setSettings({...settings, og_image: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--t4)' }}>The image shown when your site is shared on Twitter/X, Discord, or iMessage. (Example: /og.png)</p>
        </div>

        {/* Submit Button & Messages */}
        <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <button 
            type="submit" 
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'var(--acc)', color: 'white' }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {message.text && (
            <span className="text-sm font-medium px-4 py-2 rounded-lg" style={{ 
              background: message.type === 'error' ? 'rgba(248,113,113,.1)' : 'rgba(52,211,153,.1)',
              color: message.type === 'error' ? 'var(--red-val)' : 'var(--green-val)'
            }}>
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}