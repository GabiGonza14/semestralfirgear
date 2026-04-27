export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    byUser: (userId: string) => ['orders', 'by-user', userId] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },
  cart: {
    all: ['cart'] as const,
  },
  payments: {
    confirmation: (orderId: string, sessionId: string) =>
      ['payments', 'confirmation', orderId, sessionId] as const,
  },
}
