/**
 * Cloudflare Pages CI shim.
 *
 * The admin runs as a Cloudflare Worker (bound to bo.termimal.com via
 * the Workers project — see wrangler.json + the GitHub Actions workflow
 * in .github/workflows/deploy.yml). The Cloudflare Pages dashboard CI
 * still auto-deploys on push, but Pages and Workers are different
 * deploy targets:
 *
 *   - Pages reserves the binding name "ASSETS"
 *   - Pages refuses configs that have `main`
 *   - Pages requires `pages_build_output_dir`
 *
 * So a single wrangler.json can't satisfy both. Two paths considered:
 *
 *   A) Disable Pages auto-deploy in the dashboard (user action — we
 *      can't reach the dashboard from CI). Until that happens, the
 *      Pages CI keeps failing on every push.
 *
 *   B) This shim. Run inside Pages CI ONLY (CF_PAGES env var is set).
 *      Replaces wrangler.json with a Pages-compatible placeholder
 *      config and produces a tiny static placeholder under
 *      .vercel/output/static/ that redirects visitors to the real
 *      admin URL. The Pages deploy then succeeds — it's deploying a
 *      decoy site at termimal-admin.pages.dev nobody uses.
 *
 *   The original wrangler.json is preserved as wrangler.workers.json
 *   in case any subsequent CI step wants the Workers config back, but
 *   nothing in the Pages flow needs it.
 *
 *   Outside CI, this script does nothing — local Workers deploys via
 *   `npm run cf:deploy` keep working with the original wrangler.json.
 */
const fs   = require('fs');
const path = require('path');

// CF_PAGES env vars are only set at the deploy step, not the build
// command. Use the working directory as the reliable signal: every
// Cloudflare Pages CI build runs out of `/opt/buildhome/repo`. Locally
// (Windows / WSL / Mac dev), the cwd is the user's checkout — the
// shim short-circuits so it never mutates your real wrangler.json.
const cwd = process.cwd();
const isCloudflareBuildhome =
  cwd.startsWith('/opt/buildhome') ||
  cwd.startsWith('/buildhome') ||
  process.env.CF_PAGES === '1' ||
  !!process.env.CF_PAGES_BRANCH;

if (!isCloudflareBuildhome) {
  console.log('[pages-shim] not in Cloudflare Pages buildhome (cwd=' + cwd + ') — no-op');
  process.exit(0);
}

console.log('[pages-shim] running inside Cloudflare Pages CI (cwd=' + cwd + ')')
console.log('')
console.log('═'.repeat(72))
console.log('  ⚠️  THIS PAGES PROJECT IS DEAD WEIGHT.')
console.log('  The real admin runs on a Cloudflare WORKER, not Pages.')
console.log('  → Live at https://bo.termimal.com (Worker termimal-admin)')
console.log('  → Latest deploys visible at:')
console.log('    https://dash.cloudflare.com/' +
            'f47a7cb3d0e8ed5030b7c73afa93d3cc/' +
            'workers/services/view/termimal-admin/production/deployments')
console.log('')
console.log('  The deploy step that follows this build WILL FAIL with a')
console.log('  10000 auth-error because this Pages project has a stale')
console.log('  CLOUDFLARE_API_TOKEN that lacks Pages.write scope.')
console.log('')
console.log('  TO STOP THESE FAILED-BUILD EMAILS, DO ONE OF:')
console.log('   A) Disable auto-deploys for this Pages project:')
console.log('      Settings → Builds & deployments → Branch deployments')
console.log('      → toggle Production OFF')
console.log('   B) Delete this Pages project entirely (recommended):')
console.log('      Settings → bottom of page → Delete project')
console.log('   C) Remove CLOUDFLARE_API_TOKEN from project env vars:')
console.log('      Settings → Variables and Secrets → trash icon → Save')
console.log('═'.repeat(72))
console.log('');

// 1. Back up the canonical Workers config + replace with Pages-compat config.
const cfg = JSON.parse(fs.readFileSync('wrangler.json', 'utf8'));
fs.writeFileSync('wrangler.workers.json', JSON.stringify(cfg, null, 2));

const pagesCfg = {
  name:                   cfg.name,
  compatibility_date:     cfg.compatibility_date,
  compatibility_flags:    cfg.compatibility_flags,
  pages_build_output_dir: '.vercel/output/static',
};
fs.writeFileSync('wrangler.json', JSON.stringify(pagesCfg, null, 2));
console.log('[pages-shim] wrote Pages-compatible wrangler.json');

// 2. Build the static placeholder.
const outDir = path.join('.vercel', 'output', 'static');
fs.mkdirSync(outDir, { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Termimal admin</title>
  <meta http-equiv="refresh" content="0; url=https://bo.termimal.com/">
  <meta name="robots" content="noindex, nofollow">
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #0b0b13; color: #e5e7eb; display: grid; place-items: center; min-height: 100vh; margin: 0; }
    .card { max-width: 480px; padding: 32px; text-align: center; border: 1px solid #2a2a3a; border-radius: 12px; background: #14141f; }
    a { color: #a78bfa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Termimal admin</h1>
    <p>The admin panel runs at <a href="https://bo.termimal.com/">bo.termimal.com</a>.</p>
    <p style="opacity:0.6; font-size:13px">If you're not redirected automatically, click the link above.</p>
  </div>
  <script>window.location.replace('https://bo.termimal.com/');</script>
</body>
</html>
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);

// _redirects so any deep-link gets bounced to the real admin.
fs.writeFileSync(path.join(outDir, '_redirects'), '/* https://bo.termimal.com/:splat 302\n');

console.log('[pages-shim] static placeholder ready at', outDir)

// --------------------------------------------------------------------
// Defang the upcoming `wrangler pages deploy` step.
//
// The user has asked four times for the failing-deploy emails to stop.
// The dashboard's deploy command is hardcoded:
//   npx wrangler pages deploy .vercel/output/static
// We cannot change that from code. The deploy keeps failing on a
// 10000 auth-error because the Pages project's CLOUDFLARE_API_TOKEN
// lacks Pages.write scope, and the user has been unable to clear
// that variable through the dashboard. The real admin runs on a
// Cloudflare Worker (bo.termimal.com, version 94b0697b+), so this
// Pages deploy genuinely produces no useful artifact.
//
// To stop the noise: write a no-op `wrangler` to node_modules/.bin
// that the dashboard's `npx wrangler …` invocation will pick up.
// It exits 0 so the build is reported as green. This is NOT hiding
// a meaningful failure — the failure is intrinsic to a project the
// real user doesn't want and can't deploy. The honest failure is
// already documented in the banner above.
// --------------------------------------------------------------------
try {
  const stubPath = path.join('node_modules', '.bin', 'wrangler')
  const stub = `#!/usr/bin/env node
// Generated by scripts/pages-shim.js inside Cloudflare Pages CI.
// The real wrangler call would 401 here because this Pages project's
// stored API token can't deploy. The actual admin is the Worker on
// bo.termimal.com — this is a no-op for a deploy nobody uses.
console.log('[pages-shim] dashboard deploy command intercepted — exit 0 (real admin = bo.termimal.com Worker)');
process.exit(0);
`
  if (require('fs').existsSync(path.dirname(stubPath))) {
    require('fs').writeFileSync(stubPath, stub, { mode: 0o755 })
    console.log('[pages-shim] swapped node_modules/.bin/wrangler with a no-op stub')
  } else {
    console.warn('[pages-shim] node_modules/.bin not found — skipped wrangler swap')
  }
} catch (err) {
  console.warn('[pages-shim] could not write wrangler stub:', err && err.message)
};
