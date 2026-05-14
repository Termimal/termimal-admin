/**
 * Split-deploy orchestrator for the termimal-admin two-worker setup.
 *
 *   Middleware worker (termimal-admin)         ← public, bo.termimal.com
 *   Server worker     (termimal-admin-server)  ← internal, service-binding only
 *
 * Order matters: the server worker MUST be live before the middleware
 * worker references it, otherwise the middleware's first request
 * after deploy 500s with "SERVER service binding is missing".
 *
 *   Step 1: build + post-build (generates the two entrypoints)
 *   Step 2: deploy server worker (so middleware's SERVER binding exists)
 *   Step 3: deploy middleware worker (now safe — server is live)
 *
 * Re-running is safe; both deploys are idempotent.
 *
 * Usage:
 *   node scripts/deploy-split.cjs           # build + deploy both
 *   node scripts/deploy-split.cjs --build   # build only
 *   node scripts/deploy-split.cjs --server  # deploy server only
 *   node scripts/deploy-split.cjs --middleware  # deploy middleware only
 *   node scripts/deploy-split.cjs --rollback   # see runbook below
 *
 * Rollback runbook:
 *   The old single-worker deploy (wrangler.json → worker.js) is still
 *   on disk. To revert:
 *     wrangler deploy --config wrangler.json --keep-vars
 *   That re-uploads the original worker as `termimal-admin`, which
 *   overwrites the middleware-only version. The server worker keeps
 *   running but is no longer called — leave it for fast re-cutover,
 *   or delete it with `wrangler delete termimal-admin-server`.
 */
const { execSync } = require("node:child_process");
const fs   = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function step(name, fn) {
  console.log(`\n┌── ${name} ${"─".repeat(Math.max(0, 60 - name.length))}`);
  fn();
  console.log(`└── ${name} done`);
}

// Sanity-check that both entrypoints exist before we try to deploy
// either worker. A missing entry file = stale build = user forgot the
// build step.
function ensureEntries() {
  const mid = path.join(ROOT, ".open-next", "worker.middleware.js");
  const srv = path.join(ROOT, ".open-next", "worker.server.js");
  if (!fs.existsSync(mid) || !fs.existsSync(srv)) {
    console.error(`[deploy-split] missing entrypoint:`);
    console.error(`  middleware: ${fs.existsSync(mid) ? "OK" : "MISSING"} (${mid})`);
    console.error(`  server:     ${fs.existsSync(srv) ? "OK" : "MISSING"} (${srv})`);
    console.error(`Run \`node scripts/deploy-split.cjs --build\` first.`);
    process.exit(1);
  }
}

const buildOnly      = flag("--build");
const serverOnly     = flag("--server");
const middlewareOnly = flag("--middleware");
const doRollback     = flag("--rollback");

if (doRollback) {
  step("Rollback to single-worker", () => {
    run("npx wrangler deploy --config wrangler.json --keep-vars");
  });
  console.log("\n✔ Rolled back. The split workers still exist; delete them with:");
  console.log("    wrangler delete termimal-admin-server");
  process.exit(0);
}

const doBuild      = buildOnly || (!serverOnly && !middlewareOnly);
const doServer     = serverOnly || (!buildOnly && !middlewareOnly);
const doMiddleware = middlewareOnly || (!buildOnly && !serverOnly);

if (doBuild) {
  step("Build", () => {
    run("npx opennextjs-cloudflare build");
    run("node scripts/build-split.cjs");
  });
}

if (buildOnly) {
  console.log("\n✔ Build complete. Run without --build to deploy.");
  process.exit(0);
}

ensureEntries();

// Order: server FIRST so the middleware's SERVER service binding
// resolves on its first deploy. Reverse order = middleware briefly
// 500s during the rollover.
if (doServer) {
  step("Deploy server worker (termimal-admin-server)", () => {
    run("npx wrangler deploy --config wrangler.server.jsonc --keep-vars");
  });
}

if (doMiddleware) {
  step("Deploy middleware worker (termimal-admin)", () => {
    run("npx wrangler deploy --config wrangler.middleware.jsonc --keep-vars");
  });
}

console.log("\n✔ Split deploy complete.");
console.log("  Public:        https://bo.termimal.com (middleware)");
console.log("  Internal:      termimal-admin-server (service-binding only)");
console.log("\nIf 1102 returns: `node scripts/deploy-split.cjs --rollback`");
