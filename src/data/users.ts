import type { BackendUser } from '../types'

export const users: BackendUser[] = [
  {
    id: 'u1',
    clerkUserId: 'user_u1',
    fullName: 'Camila Torres',
    email: 'camila@fitgear.demo',
    role: 'CUSTOMER',
  },
  {
    id: 'u2',
    clerkUserId: 'user_u2',
    fullName: 'Admin FITGEAR',
    email: 'admin@fitgear.demo',
    role: 'ADMIN',
  },
]
