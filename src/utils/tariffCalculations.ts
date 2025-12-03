/**
 * ELECTRICITY TARIFF COMPARISON SYSTEM
 * =====================================
 * 
 * PRINCIPLE: NEVER mix OCR values with Admin tariff values
 * - CURRENT cost: Uses ONLY OCR-extracted values from customer invoice
 * - NEW cost: Uses ONLY admin-configured tariff values
 * - If ANY required value is null → keep as null, NEVER convert to 0
 * - If admin tariff is incomplete → return null, show error message
 */

// ============================================
// INTERFACES
// ============================================

export interface TarifaElectricidad {
  potencia_p1: number | null;
  potencia_p2: number | null;
  energia_p1: number | null;
  energia_p2: number | null;
  energia_p3: number | null;
  impuesto_electrico: number | null;
  iva: number | null;
}

export interface TarifaGas {
  termino_fijo: number | null;
  termino_variable: number | null;
  iva: number | null;
}

// OCR extracted data from customer invoice
export interface OCRElectricityData {
  precio_mensual: number | null;
  dias: number | null;
  potencia_kw: number | null;
  potencia_price_eur_kw_dia: number | null;
  termino_potencia_euros: number | null;
  consumo_p1_kwh: number | null;
  consumo_p2_kwh: number | null;
  consumo_p3_kwh: number | null;
  energia_p1_price: number | null;
  energia_p2_price: number | null;
  energia_p3_price: number | null;
  termino_energia_euros: number | null;
  impuesto_electrico_pct: number | null;
  iva_pct: number | null;
}

// Calculation breakdown for transparency
export interface CalculationBreakdown {
  potencia_cost: number;
  energia_cost: number;
  subtotal: number;
  impuesto_amount: number;
  subtotal_con_impuesto: number;
  iva_amount: number;
  total: number;
}

// Comparison result
export interface ComparisonResult {
  totalCurrent: number | null;
  totalNew: number | null;
  savingsMonth: number;
  savingsYear: number;
  currentBreakdown: CalculationBreakdown | null;
  newBreakdown: CalculationBreakdown | null;
  currentIncomplete: boolean;
  newIncomplete: boolean;
  incompleteReason: string | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const formatCurrency = (value: number): string => {
  return value.toFixed(2).replace(".", ",");
};

// ============================================
// CURRENT BILL CALCULATION (OCR VALUES ONLY)
// ============================================

export const calculateCurrentElectricityCost = (
  data: OCRElectricityData
): { total: number | null; breakdown: CalculationBreakdown | null; incomplete: boolean; reason: string | null } => {
  
  // PRIORITY 1: Use precio_mensual (invoice total) if available
  if (data.precio_mensual !== null && data.precio_mensual > 0) {
    console.log('✅ CURRENT: Using precio_mensual directly:', data.precio_mensual);
    return { total: data.precio_mensual, breakdown: null, incomplete: false, reason: null };
  }

  console.log('⚠️ CURRENT: precio_mensual not available, calculating from components...');

  const consumo_p1 = data.consumo_p1_kwh;
  if (consumo_p1 === null || consumo_p1 === 0) {
    return { total: null, breakdown: null, incomplete: true, reason: 'Falta consumo P1 en la factura' };
  }

  // Power cost
  let potencia_cost = 0;
  if (data.termino_potencia_euros !== null && data.termino_potencia_euros > 0) {
    potencia_cost = data.termino_potencia_euros;
  } else if (data.potencia_price_eur_kw_dia !== null && data.potencia_kw !== null && data.dias !== null) {
    potencia_cost = data.potencia_price_eur_kw_dia * data.potencia_kw * data.dias;
  }

  // Energy cost
  let energia_cost = 0;
  if (data.termino_energia_euros !== null && data.termino_energia_euros > 0) {
    energia_cost = data.termino_energia_euros;
  } else {
    if (consumo_p1 !== null && data.energia_p1_price !== null) {
      energia_cost += consumo_p1 * data.energia_p1_price;
    }
    if (data.consumo_p2_kwh !== null && data.energia_p2_price !== null) {
      energia_cost += data.consumo_p2_kwh * data.energia_p2_price;
    }
    if (data.consumo_p3_kwh !== null && data.energia_p3_price !== null) {
      energia_cost += data.consumo_p3_kwh * data.energia_p3_price;
    }
  }

  const subtotal = potencia_cost + energia_cost;
  const impuesto_pct = data.impuesto_electrico_pct ?? 5.1127;
  const impuesto_amount = subtotal * (impuesto_pct / 100);
  const subtotal_con_impuesto = subtotal + impuesto_amount;
  const iva_pct = data.iva_pct ?? 21;
  const iva_amount = subtotal_con_impuesto * (iva_pct / 100);
  const total = subtotal_con_impuesto + iva_amount;

  const breakdown: CalculationBreakdown = {
    potencia_cost, energia_cost, subtotal, impuesto_amount, subtotal_con_impuesto, iva_amount, total
  };

  return { total, breakdown, incomplete: false, reason: null };
};

// ============================================
// NEW TARIFF CALCULATION (ADMIN VALUES ONLY)
// ============================================

export const calculateNewElectricityCost = (
  ocrData: OCRElectricityData,
  adminTarifa: TarifaElectricidad
): { total: number | null; breakdown: CalculationBreakdown | null; incomplete: boolean; reason: string | null } => {
  
  // CRITICAL: Validate admin tariff completeness
  if (adminTarifa.potencia_p1 === null || adminTarifa.potencia_p1 === undefined) {
    console.error('❌ NEW: Admin tariff INCOMPLETE - potencia_p1 is null');
    return { total: null, breakdown: null, incomplete: true, reason: 'Tarifa incompleta: falta potencia_p1' };
  }

  if (adminTarifa.energia_p1 === null || adminTarifa.energia_p1 === undefined) {
    console.error('❌ NEW: Admin tariff INCOMPLETE - energia_p1 is null');
    return { total: null, breakdown: null, incomplete: true, reason: 'Tarifa incompleta: falta energia_p1' };
  }

  const dias = ocrData.dias ?? 30;
  const potencia_kw = ocrData.potencia_kw ?? 4.6;
  const consumo_p1 = ocrData.consumo_p1_kwh ?? 0;
  const consumo_p2 = ocrData.consumo_p2_kwh ?? 0;
  const consumo_p3 = ocrData.consumo_p3_kwh ?? 0;

  if (consumo_p1 === 0 && consumo_p2 === 0 && consumo_p3 === 0) {
    return { total: null, breakdown: null, incomplete: true, reason: 'Sin datos de consumo' };
  }

  const admin_potencia_p1 = adminTarifa.potencia_p1;
  const admin_energia_p1 = adminTarifa.energia_p1;
  const admin_energia_p2 = adminTarifa.energia_p2 ?? admin_energia_p1;
  const admin_energia_p3 = adminTarifa.energia_p3 ?? admin_energia_p1;
  const admin_impuesto = adminTarifa.impuesto_electrico ?? 5.1127;
  const admin_iva = adminTarifa.iva ?? 21;

  const potencia_cost = potencia_kw * dias * admin_potencia_p1;
  const energia_cost = (consumo_p1 * admin_energia_p1) + (consumo_p2 * admin_energia_p2) + (consumo_p3 * admin_energia_p3);
  const subtotal = potencia_cost + energia_cost;
  const impuesto_amount = subtotal * (admin_impuesto / 100);
  const subtotal_con_impuesto = subtotal + impuesto_amount;
  const iva_amount = subtotal_con_impuesto * (admin_iva / 100);
  const total = subtotal_con_impuesto + iva_amount;

  const breakdown: CalculationBreakdown = {
    potencia_cost, energia_cost, subtotal, impuesto_amount, subtotal_con_impuesto, iva_amount, total
  };

  console.log('📊 NEW tariff calculation:', { dias, potencia_kw, consumo_p1, admin_potencia_p1, admin_energia_p1, total });

  return { total, breakdown, incomplete: false, reason: null };
};

// ============================================
// MAIN COMPARISON FUNCTION
// ============================================

export const compareElectricityTariffs = (
  ocrData: OCRElectricityData,
  adminTarifa: TarifaElectricidad
): ComparisonResult => {
  
  console.log('═══════════════════════════════════════');
  console.log('🔄 ELECTRICITY COMPARISON START');

  const currentResult = calculateCurrentElectricityCost(ocrData);
  const newResult = calculateNewElectricityCost(ocrData, adminTarifa);

  if (currentResult.incomplete || currentResult.total === null) {
    return {
      totalCurrent: null, totalNew: newResult.total,
      savingsMonth: 0, savingsYear: 0,
      currentBreakdown: currentResult.breakdown, newBreakdown: newResult.breakdown,
      currentIncomplete: true, newIncomplete: newResult.incomplete,
      incompleteReason: currentResult.reason
    };
  }

  if (newResult.incomplete || newResult.total === null) {
    return {
      totalCurrent: currentResult.total, totalNew: null,
      savingsMonth: 0, savingsYear: 0,
      currentBreakdown: currentResult.breakdown, newBreakdown: newResult.breakdown,
      currentIncomplete: false, newIncomplete: true,
      incompleteReason: newResult.reason
    };
  }

  const savingsMonth = currentResult.total - newResult.total;
  const savingsYear = savingsMonth * 12;

  console.log('📈 RESULT: Current:', currentResult.total.toFixed(2), '€ | New:', newResult.total.toFixed(2), '€ | Savings:', savingsMonth.toFixed(2), '€/mes');

  return {
    totalCurrent: currentResult.total, totalNew: newResult.total,
    savingsMonth, savingsYear,
    currentBreakdown: currentResult.breakdown, newBreakdown: newResult.breakdown,
    currentIncomplete: false, newIncomplete: false, incompleteReason: null
  };
};

// ============================================
// LEGACY FUNCTIONS
// ============================================

const DEFAULT_CONTRACTED_POWER = 4.6;

export const calculateMonthlyElectricityPrice = (consumoKwh: number, tarifa: TarifaElectricidad): number | null => {
  if (!tarifa.energia_p1 || tarifa.potencia_p1 === null) return null;
  const energyCost = consumoKwh * tarifa.energia_p1;
  const powerCost = tarifa.potencia_p1 * 30 * DEFAULT_CONTRACTED_POWER;
  let subtotal = energyCost + powerCost;
  if (tarifa.impuesto_electrico) subtotal *= (1 + tarifa.impuesto_electrico / 100);
  if (tarifa.iva) subtotal *= (1 + tarifa.iva / 100);
  return subtotal;
};

export const calculateMonthlyGasPrice = (consumoKwh: number, tarifa: TarifaGas): number | null => {
  if (!tarifa.termino_variable) return null;
  let subtotal = consumoKwh * tarifa.termino_variable;
  if (tarifa.termino_fijo) subtotal += tarifa.termino_fijo;
  if (tarifa.iva) subtotal *= (1 + tarifa.iva / 100);
  return subtotal;
};

export interface SimpleElectricityData {
  precio_mensual: number;
  potencia_kw: number;
  days: number;
  consumo_p1_kwh: number;
  consumo_p2_kwh: number;
  consumo_p3_kwh: number;
}

export const convertToOCRFormat = (extractedData: any): OCRElectricityData => {
  return {
    precio_mensual: extractedData?.precio_mensual ?? null,
    dias: extractedData?.potencia_days ?? null,
    potencia_kw: extractedData?.potencia_kw ?? null,
    potencia_price_eur_kw_dia: extractedData?.potencia_price ?? null,
    termino_potencia_euros: extractedData?.termino_potencia_euros ?? null,
    consumo_p1_kwh: extractedData?.consumo_p1 ?? extractedData?.consumo_kwh ?? null,
    consumo_p2_kwh: extractedData?.consumo_p2 ?? null,
    consumo_p3_kwh: extractedData?.consumo_p3 ?? null,
    energia_p1_price: extractedData?.energia_p1_price ?? null,
    energia_p2_price: extractedData?.energia_p2_price ?? null,
    energia_p3_price: extractedData?.energia_p3_price ?? null,
    termino_energia_euros: extractedData?.termino_energia_euros ?? null,
    impuesto_electrico_pct: extractedData?.impuesto_electrico ?? null,
    iva_pct: extractedData?.iva ?? null,
  };
};
