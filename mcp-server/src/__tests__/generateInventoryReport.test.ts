import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock the inventory report service before importing the tool.
const sampleReport = {
  generatedAt: '2026-07-11T10:00:00.000Z',
  summary: { productCount: 2, totalUnits: 15, totalInventoryValue: 250, lowStockCount: 1 },
  rows: [
    {
      productId: 'p1',
      name: 'Mancuerna 5kg',
      category: 'Pesas',
      stock: 3,
      unitPrice: 30,
      totalValue: 90,
      lowStock: true,
      lowStockThreshold: 5,
      isActive: true,
    },
    {
      productId: 'p2',
      name: 'Banda elastica',
      category: 'Bandas',
      stock: 12,
      unitPrice: 10,
      totalValue: 120,
      lowStock: false,
      lowStockThreshold: 5,
      isActive: true,
    },
  ],
}

const mockBuildInventoryReport = mock(async () => sampleReport)

mock.module('../../../backend/src/services/inventoryReportService', () => ({
  buildInventoryReport: mockBuildInventoryReport,
}))

// Mock the User model — the tool resolves clerkUserId -> role via findOne().select().
const mockSelect = mock(async () => null as unknown)
const mockFindOne = mock(() => ({ select: mockSelect }))

mock.module('../../../backend/src/models/User', () => ({
  UserModel: { findOne: mockFindOne },
}))

// requireAuthStrict is the protected-auth gate — controlled per test.
const mockRequireAuthStrict = mock(async () => ({ userId: 'clerk_admin', authenticated: true }))

mock.module('../../../backend/src/middlewares/requireAuth', () => ({
  requireAuth: mock(async () => ({ userId: null, authenticated: false })),
  requireAuthStrict: mockRequireAuthStrict,
}))

// Import after mocking so the tool picks up the mocked modules.
const { generateInventoryReportTool } = await import('../tools/generateInventoryReport')

describe('generateInventoryReportTool', () => {
  beforeEach(() => {
    mockBuildInventoryReport.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_admin', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ role: 'ADMIN' }))
  })

  it('returns the structured report without CSV by default', async () => {
    const result = await generateInventoryReportTool({ token: 'valid.jwt' })

    expect(result).toEqual(sampleReport)
    expect('csv' in result).toBe(false)
  })

  it('embeds a CSV string when includeCsv is true', async () => {
    const result = await generateInventoryReportTool({ token: 'valid.jwt', includeCsv: true })

    expect(result.summary).toEqual(sampleReport.summary)
    expect(typeof result.csv).toBe('string')
    // The CSV carries the semicolon-delimited header and marks the low-stock product.
    expect(result.csv).toContain('Nombre;Categoria;Stock actual')
    expect(result.csv).toContain('Mancuerna 5kg')
    expect(result.csv).toContain('Si') // low-stock flag column for Mancuerna
  })

  it('rejects when the resolved user is not an ADMIN', async () => {
    mockSelect.mockImplementationOnce(async () => ({ role: 'CUSTOMER' }))

    await expect(generateInventoryReportTool({ token: 'valid.jwt' })).rejects.toThrow(
      'admin role required',
    )
    expect(mockBuildInventoryReport).not.toHaveBeenCalled()
  })

  it('rejects when the user has no linked Mongo profile', async () => {
    mockSelect.mockImplementationOnce(async () => null)

    await expect(generateInventoryReportTool({ token: 'valid.jwt' })).rejects.toThrow(
      'admin role required',
    )
    expect(mockBuildInventoryReport).not.toHaveBeenCalled()
  })

  it('rejects without a valid token', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(generateInventoryReportTool({ token: 'valid.jwt' })).rejects.toThrow('Unauthorized')
    expect(mockFindOne).not.toHaveBeenCalled()
    expect(mockBuildInventoryReport).not.toHaveBeenCalled()
  })
})
