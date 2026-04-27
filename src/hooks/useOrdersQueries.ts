import { useQuery } from '@tanstack/react-query'
import { getMyOrders, getOrderById } from '../api/fitgearApi'
import { queryKeys } from '../lib/queryKeys'

export function useMyOrdersQuery(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.orders.byUser(userId ?? 'unknown'),
    enabled: enabled && Boolean(userId),
    queryFn: () => getMyOrders(userId!),
  })
}

export function useOrderDetailQuery(orderId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? 'unknown'),
    enabled: enabled && Boolean(orderId),
    queryFn: () => getOrderById(orderId!),
  })
}
