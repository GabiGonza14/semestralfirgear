import { useCallback, useEffect, useRef, useState } from 'react'

export type AdminNoticeType = 'success' | 'error'

export interface AdminNotice {
  /** Monotonic id so re-showing the same text still restarts the timer/animation. */
  id: number
  type: AdminNoticeType
  message: string
}

// How long a confirmation/error banner stays before auto-dismissing.
const NOTICE_TTL_MS = 10_000

/**
 * Single-slot notification state for the admin panel (products, categories…).
 *
 * - Auto-dismisses after 10s.
 * - Never stacks: a new notice REPLACES the current one and restarts the timer,
 *   so firing several actions in a row shows only the latest message instead of
 *   piling banners up.
 * - Meant to be rendered with <AdminNotice>, which reuses the existing inline
 *   emerald/rose banner styling — so the look is unchanged, only the behaviour
 *   (timed, de-duplicated) is added.
 */
export function useAdminNotice() {
  const [notice, setNotice] = useState<AdminNotice | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    setNotice(null)
  }, [clearTimer])

  const notify = useCallback(
    (type: AdminNoticeType, message: string) => {
      // Replace whatever is showing (no stacking) and restart the 10s timer.
      clearTimer()
      seqRef.current += 1
      setNotice({ id: seqRef.current, type, message })
      timerRef.current = setTimeout(() => setNotice(null), NOTICE_TTL_MS)
    },
    [clearTimer],
  )

  const notifySuccess = useCallback((message: string) => notify('success', message), [notify])
  const notifyError = useCallback((message: string) => notify('error', message), [notify])

  // Don't leave a timer running after the section unmounts.
  useEffect(() => clearTimer, [clearTimer])

  return { notice, notifySuccess, notifyError, dismiss }
}
