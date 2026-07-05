import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { HttpError } from '../../utils/httpError'

// Mock the categoryService before importing the tool.
const mockListCategories = mock(async () => [] as unknown[])
const mockCreateCategory = mock(async () => ({}))
const mockUpdateCategory = mock(async () => ({}))
const mockDeleteCategory = mock(async () => undefined)

mock.module('../../services/categoryService', () => ({
  listCategories: mockListCategories,
  createCategory: mockCreateCategory,
  updateCategory: mockUpdateCategory,
  deleteCategory: mockDeleteCategory,
}))

// Mock the User model — the tool resolves clerkUserId -> role via findOne().select().
const mockSelect = mock(async () => null as unknown)
const mockFindOne = mock(() => ({ select: mockSelect }))

mock.module('../../models/User', () => ({
  UserModel: { findOne: mockFindOne },
}))

// requireAuthStrict is the protected-auth gate — controlled per test.
const mockRequireAuthStrict = mock(async () => ({ userId: 'clerk_admin', authenticated: true }))

mock.module('../../middlewares/requireAuth', () => ({
  requireAuth: mock(async () => ({ userId: null, authenticated: false })),
  requireAuthStrict: mockRequireAuthStrict,
}))

// Import after mocking so the tool picks up the mocked modules.
const { manageCategoriesTool } = await import('../../mcp/tools/manageCategories')

const CAT_ID = '507f1f77bcf86cd799439011'

const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  _id: CAT_ID,
  name: 'Pesas',
  description: 'Mancuernas y kettlebells',
  requiresSizes: false,
  ...overrides,
})

describe('manageCategoriesTool', () => {
  beforeEach(() => {
    mockListCategories.mockClear()
    mockCreateCategory.mockClear()
    mockUpdateCategory.mockClear()
    mockDeleteCategory.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_admin', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ role: 'ADMIN' }))
  })

  it('list — returns mapped categories', async () => {
    mockListCategories.mockResolvedValueOnce([
      makeCategory(),
      makeCategory({ _id: '507f1f77bcf86cd799439012', name: 'Ropa', requiresSizes: true }),
    ])

    const result = await manageCategoriesTool({ action: 'list', token: 'valid.jwt' })

    expect(result).toEqual({
      action: 'list',
      ok: true,
      categories: [
        { id: CAT_ID, name: 'Pesas', description: 'Mancuernas y kettlebells', requiresSizes: false },
        { id: '507f1f77bcf86cd799439012', name: 'Ropa', description: 'Mancuernas y kettlebells', requiresSizes: true },
      ],
    })
  })

  it('create — success returns the new category', async () => {
    mockCreateCategory.mockResolvedValueOnce(makeCategory({ name: 'Accesorios' }))

    const result = await manageCategoriesTool({ action: 'create', token: 'valid.jwt', name: 'Accesorios' })

    expect(result).toMatchObject({ action: 'create', ok: true, category: { name: 'Accesorios' } })
    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: 'Accesorios',
      description: undefined,
      requiresSizes: undefined,
    })
  })

  it('create — duplicate name translated to a clean ok:false result', async () => {
    mockCreateCategory.mockImplementationOnce(async () => {
      throw new HttpError(409, 'Category name already exists')
    })

    const result = await manageCategoriesTool({ action: 'create', token: 'valid.jwt', name: 'Pesas' })

    expect(result).toEqual({
      action: 'create',
      ok: false,
      statusCode: 409,
      message: 'Category name already exists',
    })
  })

  it('update — success returns the updated category', async () => {
    mockUpdateCategory.mockResolvedValueOnce(makeCategory({ description: 'Nueva desc' }))

    const result = await manageCategoriesTool({
      action: 'update',
      token: 'valid.jwt',
      id: CAT_ID,
      description: 'Nueva desc',
    })

    expect(result).toMatchObject({ action: 'update', ok: true, category: { description: 'Nueva desc' } })
    expect(mockUpdateCategory).toHaveBeenCalledWith(CAT_ID, {
      name: undefined,
      description: 'Nueva desc',
      requiresSizes: undefined,
    })
  })

  it('update — not found translated to a clean ok:false result', async () => {
    mockUpdateCategory.mockImplementationOnce(async () => {
      throw new HttpError(404, 'Category not found')
    })

    const result = await manageCategoriesTool({
      action: 'update',
      token: 'valid.jwt',
      id: CAT_ID,
      name: 'X',
    })

    expect(result).toEqual({ action: 'update', ok: false, statusCode: 404, message: 'Category not found' })
  })

  it('update — rejects (ZodError) when no updatable field is provided', async () => {
    await expect(
      manageCategoriesTool({ action: 'update', token: 'valid.jwt', id: CAT_ID }),
    ).resolves.toMatchObject({ ok: false, statusCode: 400 })
    expect(mockUpdateCategory).not.toHaveBeenCalled()
  })

  it('delete — success', async () => {
    mockDeleteCategory.mockResolvedValueOnce(undefined)

    const result = await manageCategoriesTool({ action: 'delete', token: 'valid.jwt', id: CAT_ID })

    expect(result).toEqual({ action: 'delete', ok: true, id: CAT_ID })
    expect(mockDeleteCategory).toHaveBeenCalledWith(CAT_ID)
  })

  it('delete — blocked because category is in use, translated to ok:false', async () => {
    mockDeleteCategory.mockImplementationOnce(async () => {
      throw new HttpError(409, 'Category cannot be deleted because it is used by products')
    })

    const result = await manageCategoriesTool({ action: 'delete', token: 'valid.jwt', id: CAT_ID })

    expect(result).toEqual({
      action: 'delete',
      ok: false,
      statusCode: 409,
      message: 'Category cannot be deleted because it is used by products',
    })
  })

  it('rejects when the resolved user is not ADMIN (applies to list too)', async () => {
    mockSelect.mockImplementationOnce(async () => ({ role: 'CUSTOMER' }))

    await expect(
      manageCategoriesTool({ action: 'list', token: 'valid.jwt' }),
    ).rejects.toThrow('admin role required')
    expect(mockListCategories).not.toHaveBeenCalled()
  })

  it('rejects without a valid token', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(
      manageCategoriesTool({ action: 'list', token: 'bad.jwt' }),
    ).rejects.toThrow('Unauthorized')
    expect(mockFindOne).not.toHaveBeenCalled()
  })
})
