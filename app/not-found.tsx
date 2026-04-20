import Link from 'next/link';

// This is the missing piece Cloudflare needs for the build to pass!
export const runtime = 'edge';

export default function NotFound() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4" 
      style={{ background: 'var(--bg)', color: 'var(--t1)' }}
    >
      <div className="text-center space-y-6 max-w-md">
        <h1 
          className="text-7xl font-bold tracking-tighter" 
          style={{ color: 'var(--t4)' }}
        >
          404
        </h1>
        
        <h2 className="text-2xl font-semibold tracking-tight">
          Page Not Found
        </h2>
        
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div className="pt-4">
          <Link 
            href="/admin" 
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)',
              color: 'var(--t1)'
            }}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}