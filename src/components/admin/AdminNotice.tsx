import type { AdminNotice as AdminNoticeData } from '../../hooks/useAdminNotice'

// Same emerald (success) / rose (error) palette the admin sections already used
// for their inline banners — kept identical so the design doesn't change.
const TONE_CLASSES: Record<AdminNoticeData['type'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
}

interface AdminNoticeProps {
  notice: AdminNoticeData | null
  /** Extra classes for spacing in the specific spot it's rendered (e.g. "mt-4"). */
  className?: string
}

/**
 * Inline confirmation/error banner for the admin panel, driven by
 * useAdminNotice (10s auto-dismiss, single-slot / no stacking). Renders nothing
 * when there's no active notice. `key={notice.id}` remounts on each new message
 * so screen readers re-announce it even if the text is unchanged.
 */
export function AdminNotice({ notice, className = '' }: Readonly<AdminNoticeProps>) {
  if (!notice) {
    return null
  }

  return (
    <p
      key={notice.id}
      role={notice.type === 'error' ? 'alert' : 'status'}
      aria-live={notice.type === 'error' ? 'assertive' : 'polite'}
      className={`rounded-2xl border px-4 py-3 text-sm ${TONE_CLASSES[notice.type]} ${className}`.trim()}
    >
      {notice.message}
    </p>
  )
}
