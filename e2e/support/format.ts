// Mirrors src/utils/format.ts's formatCurrency exactly, so specs can compute
// the expected on-screen text instead of hardcoding a currency symbol that
// depends on ICU/locale data in the test runner.
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
