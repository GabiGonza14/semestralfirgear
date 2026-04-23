import type { Order } from '../types'

export const orders: Order[] = [
  {
    id: 'o-1001',
    customerName: 'Camila Torres',
    total: 129.48,
    status: 'paid',
    createdAt: '2026-04-14',
  },
  {
    id: 'o-1002',
    customerName: 'Diego Martinez',
    total: 69.99,
    status: 'pending',
    createdAt: '2026-04-17',
  },
  {
    id: 'o-1003',
    customerName: 'Valentina Ruiz',
    total: 199.0,
    status: 'shipped',
    createdAt: '2026-04-19',
  },
]
