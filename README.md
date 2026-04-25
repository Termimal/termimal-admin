# Termimal Admin

Next.js admin panel for Termimal with Supabase auth, admin routes, and Cloudflare-compatible deployment.

## Stack

- Next.js 14 App Router
- Supabase Auth + PostgreSQL
- Stripe billing
- Tailwind CSS
- Cloudflare deployment

## Local setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Environment variables

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_SITE_URL

## Important routes

- /login
- /dashboard
- /admin
- /admin/users
- /admin/content
- /admin/faqs
- /admin/flags

## Deployment

For Cloudflare, make sure SSL is set to Full (strict) and avoid duplicate HTTPS or canonical-domain redirects.

## Redirect loop troubleshooting

If you see ERR_TOO_MANY_REDIRECTS:

1. Check middleware and login redirects.
2. Check next.config redirect rules.
3. Check NEXT_PUBLIC_SITE_URL.
4. Make sure /login is not redirecting back to itself.
5. Make sure admin middleware excludes public routes correctly.
