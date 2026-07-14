import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing paymentService ----------------------

// Stripe client: getStripeClient().checkout.sessions.create(...) -> a session.
const mockSessionCreate = mock(async () => ({ id: 'cs_test_123', url: 'https://stripe.test/session' }))
mock.module('../../config/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mockSessionCreate } } }),
}))

// Order model: findById().populate() -> order document; findByIdAndUpdate() persists the session id.
const fakeOrder: Record<string, unknown> = {}
const mockOrderPopulate = mock(async () => fakeOrder as unknown)
const mockOrderFindById = mock(() => ({ populate: mockOrderPopulate }))
const mockOrderFindByIdAndUpdate = mock(async () => ({}))
mock.module('../../models/Order', () => ({
  OrderModel: { findById: mockOrderFindById, findByIdAndUpdate: mockOrderFindByIdAndUpdate },
}))

// OrderItem model: .select() feeds the stock check, .populate() feeds the Stripe line items.
let fakeGroupedItems: Array<Record<string, unknown>> = []
let fakePopulatedItems: Array<Record<string, unknown>> = []
const mockItemSelect = mock(async () => fakeGroupedItems)
const mockItemPopulate = mock(async () => fakePopulatedItems)
const mockItemFind = mock(() => ({ select: mockItemSelect, populate: mockItemPopulate }))
mock.module('../../models/OrderItem', () => ({ OrderItemModel: { find: mockItemFind } }))

// Product model: .select() backs the stock/isActive check in ensureOrderHasAvailableStock.
let fakeProducts: Array<Record<string, unknown>> = []
const mockProductSelect = mock(async () => fakeProducts)
const mockProductFind = mock(() => ({ select: mockProductSelect }))
mock.module('../../models/Product', () => ({ ProductModel: { find: mockProductFind } }))

const { createCheckoutSession, extractShippingAddress } = await import('../../services/paymentService')

describe('createCheckoutSession — shipping address collection', () => {
  beforeEach(() => {
    mockSessionCreate.mockClear()
    mockOrderFindById.mockClear()
    mockOrderPopulate.mockClear()
    mockOrderFindByIdAndUpdate.mockClear()
    mockItemFind.mockClear()
    mockItemSelect.mockClear()
    mockItemPopulate.mockClear()
    mockProductFind.mockClear()
    mockProductSelect.mockClear()

    Object.keys(fakeOrder).forEach((key) => delete fakeOrder[key])
    Object.assign(fakeOrder, {
      _id: 'order_abcdef',
      status: 'PENDING',
      userId: { email: 'buyer@example.com', role: 'CUSTOMER' },
    })

    const productId = '507f1f77bcf86cd799439011'
    fakeGroupedItems = [{ productId, quantity: 1, size: null }]
    fakeProducts = [
      { _id: productId, name: 'Guantes', stock: 5, isActive: true, sizes: [] },
    ]
    fakePopulatedItems = [
      { productId: { _id: productId, name: 'Guantes', images: [] }, quantity: 1, unitPrice: 19.99 },
    ]
  })

  it('restricts Stripe checkout to Panama addresses only', async () => {
    await createCheckoutSession('order_abcdef')

    expect(mockSessionCreate).toHaveBeenCalledTimes(1)
    const [params] = mockSessionCreate.mock.calls[0] as unknown as [
      { shipping_address_collection?: { allowed_countries: string[] } },
    ]
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ['PA'] })
  })
})

describe('extractShippingAddress', () => {
  it('returns undefined when Stripe collected no shipping details', () => {
    expect(extractShippingAddress({ collected_information: null })).toBeUndefined()
    expect(extractShippingAddress({ collected_information: undefined })).toBeUndefined()
  })

  it('maps the collected address, dropping fields Stripe left null', () => {
    const result = extractShippingAddress({
      collected_information: {
        business_name: null,
        individual_name: null,
        shipping_details: {
          name: 'Juan Pérez',
          address: {
            line1: 'Calle 50',
            line2: null,
            city: 'Panamá',
            state: null,
            postal_code: '0801',
            country: 'PA',
          },
        },
      },
    } as never)

    expect(result).toEqual({
      name: 'Juan Pérez',
      line1: 'Calle 50',
      line2: undefined,
      city: 'Panamá',
      state: undefined,
      postalCode: '0801',
      country: 'PA',
    })
  })
})
