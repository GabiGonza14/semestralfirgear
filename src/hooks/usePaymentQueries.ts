import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../api/apiClient'
import { confirmCheckoutPayment } from '../api/fitgearApi'
import { queryKeys } from '../lib/queryKeys'

const PAYMENT_CONFIRMATION_RETRYABLE_STATUS = 409

// `authReady` gates the query until Clerk has resolved the session and the
// auth-token getter is registered (AuthContext). Stripe redirects back to the
// success page as a full page load, so without this gate the confirmation
// request fires before the token exists and the backend answers 401
// ("No se proporciono token de autenticacion").
export function useCheckoutPaymentConfirmationQuery(
  orderId: string | null,
  sessionId: string | null,
  authReady: boolean,
) {
  return useQuery({
    queryKey: queryKeys.payments.confirmation(orderId ?? 'unknown', sessionId ?? 'none'),
    enabled: Boolean(orderId) && authReady,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      const isRetryable =
        error instanceof ApiError &&
        error.status === PAYMENT_CONFIRMATION_RETRYABLE_STATUS

      return isRetryable && failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
    queryFn: () =>
      confirmCheckoutPayment({
        orderId: orderId!,
        sessionId: sessionId ?? undefined,
      }),
  })
}
