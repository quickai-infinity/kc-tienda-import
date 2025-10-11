/**
 * Format price in European locale (es-ES) with currency symbol
 * @param priceCents - Price in cents (e.g., 253400 for €2,534.00)
 * @param currency - Currency code (default: 'EUR')
 * @returns Formatted price string (e.g., "2.534,00 €")
 */
export function formatPrice(priceCents: number, currency: string = 'EUR'): string {
  const priceInUnits = priceCents / 100;
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceInUnits);
}
