export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null

  let host = null
  try {
    host = url ? new URL(url).host : null
  } catch {
    host = 'INVALID_URL'
  }

  return Response.json({
    hasUrl: !!url,
    url: url,
    host,
    anonPrefix: anon ? anon.slice(0, 20) : null,
    anonLength: anon ? anon.length : 0,
  })
}
