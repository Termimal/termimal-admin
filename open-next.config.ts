import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Admin Worker bundle config.
 *
 * Future-me note on minify (do not bother trying again):
 *
 * Setting `default.minify = true` on the returned config looks like it
 * should shrink the ~9 MB handler.mjs that this build produces. It
 * doesn't — the @opennextjs/cloudflare adapter's build() function
 * forcibly overwrites it with `false` so it can run string-replacement
 * patches on the source. (See node_modules/@opennextjs/cloudflare/
 * dist/cli/build/build.js: `options.minify = false`.) The flag is
 * silently dropped.
 *
 * A post-build esbuild --minify pass on handler.mjs was tried as well.
 * Result: 9.74 MB → 9.64 MB (1.1 % saved), plus esbuild warnings about
 * `require()` calls it couldn't convert to ESM — those are runtime
 * landmines. Not worth the build complexity for that size cut.
 *
 * The real cold-start CPU lever, if 1102s keep recurring, is splitting
 * routes via `functions: { ... }` so cold paths don't pull every
 * route's deps into the same Worker. That's a bigger refactor.
 */
export default defineCloudflareConfig({});
