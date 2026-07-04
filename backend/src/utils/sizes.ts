export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export type SizeLabel = (typeof SIZE_OPTIONS)[number]
