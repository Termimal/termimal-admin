/**
 * /admin/gdpr-sub-processors — permanent redirect to the canonical
 * /admin/sub-processors route.
 *
 * The nav-catalog historically pointed at this slug while the real
 * route lives at /admin/sub-processors. Fixing the nav alone (a
 * separate PR) doesn't help anyone who hit the old URL via a
 * bookmark, copy/pasted link, or stale browser history. This stub
 * makes the old URL work permanently — 308 keeps method + query
 * intact for any future link-share use.
 */
import { permanentRedirect } from 'next/navigation'

export default function GdprSubProcessorsRedirect() {
  permanentRedirect('/admin/sub-processors')
}
