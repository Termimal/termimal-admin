import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Worker bundle config.
 *
 * minify: true halves the bundle size which materially reduces cold-
 * start CPU. Workers have a hard CPU ceiling per request, and Next 15
 * + OpenNext eval can spike at startup. Smaller bundle ⇒ faster eval ⇒
 * fewer Error 1102s.
 */
export default defineCloudflareConfig({
  minify: true,
});
