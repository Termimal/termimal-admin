/**
 * /admin/data-export — permanent redirect to /admin/export.
 *
 * Same class of bug as /admin/gdpr-sub-processors: the nav-catalog
 * pointed at this slug while the real route lives at /admin/export.
 * Stub so old links keep working.
 */
import { permanentRedirect } from 'next/navigation'

export default function DataExportRedirect() {
  permanentRedirect('/admin/export')
}
