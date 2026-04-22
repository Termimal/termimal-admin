import Link from 'next/link'

export default function AdminCreditsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Credits Management</h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          Credit adjustments are now handled from the individual user detail screen so every action stays tied to a specific account.
        </p>
      </div>

      <div className="p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-lg font-bold mb-3">Recommended workflow</h2>
        <ol className="space-y-3 text-sm" style={{ color: 'var(--t3)' }}>
          <li>1. Open the Users tab.</li>
          <li>2. Search the target account by email, name, phone, or account ID.</li>
          <li>3. Click View or the account ID.</li>
          <li>4. Use the Manual crediting panel inside that user’s account screen.</li>
        </ol>
      </div>

      <div>
        <Link href="/admin/users" className="btn-primary px-4 py-2 inline-flex text-sm">Go to Users</Link>
      </div>
    </div>
  )
}