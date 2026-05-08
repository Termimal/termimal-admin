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

const isCI = process.env.CF_PAGES === '1' || !!process.env.CF_PAGES_BRANCH;

if (!isCI) {
  console.log('[pages-shim] not running in Cloudflare Pages CI — no-op');
  process.exit(0);
}

console.log('[pages-shim] running inside Cloudflare Pages CI');

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

console.log('[pages-shim] static placeholder ready at', outDir);
