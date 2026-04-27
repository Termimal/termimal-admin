export const dynamic = 'force-dynamic'

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-white">
      <h1 className="text-3xl font-bold mb-4 text-red-500">Access Denied</h1>
      <p className="text-zinc-400 mb-8">You do not have administrator privileges to view this page.</p>
      <a href="/login" className="px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-zinc-200 transition">
        Return to Login
      </a>
    </div>
  )
}
