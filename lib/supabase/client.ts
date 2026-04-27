import { createBrowserClient } from '@supabase/ssr'

function createNoopClient() {
  const result = Promise.resolve({ data: null, error: null, count: null, status: 200, statusText: 'OK' })
  const chain: any = new Proxy(function () {}, {
    get(_target: any, prop: string) {
      if (prop === 'then') return result.then.bind(result)
      if (prop === 'catch') return result.catch.bind(result)
      if (prop === 'finally') return result.finally.bind(result)
      return chain
    },
    apply() { return chain }
  })
  return chain
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    if (typeof window === 'undefined') {
      return createNoopClient()
    }
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(url, key)
}