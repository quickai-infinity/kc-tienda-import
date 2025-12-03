/**
 * ELECTRICITY TARIFF COMPARISON SYSTEM - V2
 * ==========================================
 * 
 * NEW PRINCIPLE: NEVER BLOCK CALCULATIONS
 * - Use ONLY available data from invoice and admin tariff
 * - Skip missing fields (log them, but don't block)
 * - Support negative savings (new tariff more expensive)
 * - potencia_p1 is stored as €/kW/AÑO → convert to €/kW/día (divide by 365)
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

// Detailed calculation breakdown
export interface CalculationDetail {
  potencia: number;
  energia_p1: number;
  energia_p2: number;
  energia_p3: number;
  subtotal: number;
  impuesto: number;
  iva: number;
  total: number;
}

// Legacy breakdown for compatibility
export interface CalculationBreakdown {
  potencia_cost: number;
  energia_cost: number;
  subtotal: number;
  impuesto_amount: number;
  subtotal_con_impuesto: number;
  iva_amount: number;
  total: number;
}

// New comparison result with detailed breakdown
export interface DetailedComparisonResult {
  totalActual: number;
  totalComparacion: number;
  diferencia: number;
  empresaNombre: string;
  mensaje: string;
  detalle: CalculationDetail;
  missingAdminFields: string[];
  missingOcrFields: string[];
}

// Legacy comparison result
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
  // NEW: Detailed breakdown for transparency
  detalle?: CalculationDetail;
  missingAdminFields?: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const formatCurrency = (value: number): string => {
  return value.toFixed(2).replace(".", ",");
};

// ============================================
// NEW: DYNAMIC ELECTRICITY COMPARISON
// NEVER BLOCKS - Always returns a result
// ============================================

export const calculateElectricityComparison = (
  ocrData: OCRElectricityData,
  adminTarifa: TarifaElectricidad,
  empresaNombre: string = "Empresa"
): DetailedComparisonResult => {
  
  console.log('═══════════════════════════════════════');
  console.log('🔄 ELECTRICITY COMPARISON V2 START');
  console.log('OCR Data:', ocrData);
  console.log('Admin Tarifa:', adminTarifa);
  
  const missingAdminFields: string[] = [];
  const missingOcrFields: string[] = [];

  // Track missing admin fields (for logging only - don't block)
  if (adminTarifa.potencia_p1 === null || adminTarifa.potencia_p1 === undefined) {
    missingAdminFields.push('potencia_p1');
  }
  if (adminTarifa.energia_p1 === null || adminTarifa.energia_p1 === undefined) {
    missingAdminFields.push('energia_p1');
  }
  if (adminTarifa.energia_p2 === null || adminTarifa.energia_p2 === undefined) {
    missingAdminFields.push('energia_p2');
  }
  if (adminTarifa.energia_p3 === null || adminTarifa.energia_p3 === undefined) {
    missingAdminFields.push('energia_p3');
  }
  if (adminTarifa.impuesto_electrico === null || adminTarifa.impuesto_electrico === undefined) {
    missingAdminFields.push('impuesto_electrico');
  }
  if (adminTarifa.iva === null || adminTarifa.iva === undefined) {
    missingAdminFields.push('iva');
  }

  // Track missing OCR fields
  if (!ocrData.dias) missingOcrFields.push('dias');
  if (!ocrData.potencia_kw) missingOcrFields.push('potencia_kw');
  if (!ocrData.consumo_p1_kwh) missingOcrFields.push('consumo_p1');

  console.log("Missing admin tariff values:", missingAdminFields);
  console.log("Missing OCR values:", missingOcrFields);

  // ============================================
  // STEP 1: Calculate CURRENT cost (from invoice)
  // ============================================
  let totalActual = 0;

  // Priority: use precio_mensual directly if available
  if (ocrData.precio_mensual !== null && ocrData.precio_mensual > 0) {
    totalActual = ocrData.precio_mensual;
    console.log('✅ CURRENT: Using precio_mensual directly:', totalActual);
  } else {
    // Calculate from components using invoice prices
    const dias = ocrData.dias ?? 30;
    const potenciaKw = ocrData.potencia_kw ?? 4.6;
    
    // Power cost from invoice
    let potenciaCostActual = 0;
    if (ocrData.termino_potencia_euros !== null && ocrData.termino_potencia_euros > 0) {
      potenciaCostActual = ocrData.termino_potencia_euros;
    } else if (ocrData.potencia_price_eur_kw_dia !== null) {
      potenciaCostActual = ocrData.potencia_price_eur_kw_dia * potenciaKw * dias;
    }
    
    // Energy cost from invoice
    let energiaCostActual = 0;
    if (ocrData.termino_energia_euros !== null && ocrData.termino_energia_euros > 0) {
      energiaCostActual = ocrData.termino_energia_euros;
    } else {
      if (ocrData.consumo_p1_kwh && ocrData.energia_p1_price) {
        energiaCostActual += ocrData.consumo_p1_kwh * ocrData.energia_p1_price;
      }
      if (ocrData.consumo_p2_kwh && ocrData.energia_p2_price) {
        energiaCostActual += ocrData.consumo_p2_kwh * ocrData.energia_p2_price;
      }
      if (ocrData.consumo_p3_kwh && ocrData.energia_p3_price) {
        energiaCostActual += ocrData.consumo_p3_kwh * ocrData.energia_p3_price;
      }
    }
    
    const subtotalActual = potenciaCostActual + energiaCostActual;
    const impuestoPctActual = ocrData.impuesto_electrico_pct ?? 5.1127;
    const impuestoActual = subtotalActual * (impuestoPctActual / 100);
    const subtotalConImpuestoActual = subtotalActual + impuestoActual;
    const ivaPctActual = ocrData.iva_pct ?? 21;
    const ivaActual = subtotalConImpuestoActual * (ivaPctActual / 100);
    totalActual = subtotalConImpuestoActual + ivaActual;
    
    console.log('📊 CURRENT calculated from components:', totalActual);
  }

  // ============================================
  // STEP 2: Calculate NEW cost (from admin tariff)
  // Use ONLY available values - skip missing ones
  // ============================================
  const dias = ocrData.dias ?? 30;
  const potenciaKw = ocrData.potencia_kw ?? 4.6;
  const consumoP1 = ocrData.consumo_p1_kwh ?? 0;
  const consumoP2 = ocrData.consumo_p2_kwh ?? 0;
  const consumoP3 = ocrData.consumo_p3_kwh ?? 0;

  // CRITICAL FIX: potencia_p1 is stored as €/kW/AÑO (year), NOT daily
  // Must convert to €/kW/día by dividing by 365
  let precioPotenciaDiario = 0;
  if (adminTarifa.potencia_p1 !== null && adminTarifa.potencia_p1 !== undefined) {
    precioPotenciaDiario = adminTarifa.potencia_p1 / 365;
  }
  
  const totalPotencia = potenciaKw * dias * precioPotenciaDiario;

  // Energy costs - use only periods that have consumption
  let totalP1 = 0;
  let totalP2 = 0;
  let totalP3 = 0;

  if (consumoP1 > 0 && adminTarifa.energia_p1 !== null && adminTarifa.energia_p1 !== undefined) {
    totalP1 = consumoP1 * adminTarifa.energia_p1;
  }
  
  // Only calculate P2 if invoice has P2 consumption
  if (consumoP2 > 0) {
    if (adminTarifa.energia_p2 !== null && adminTarifa.energia_p2 !== undefined) {
      totalP2 = consumoP2 * adminTarifa.energia_p2;
    } else if (adminTarifa.energia_p1 !== null) {
      // Fallback to P1 price if P2 not configured
      totalP2 = consumoP2 * adminTarifa.energia_p1;
    }
  }
  
  // Only calculate P3 if invoice has P3 consumption
  if (consumoP3 > 0) {
    if (adminTarifa.energia_p3 !== null && adminTarifa.energia_p3 !== undefined) {
      totalP3 = consumoP3 * adminTarifa.energia_p3;
    } else if (adminTarifa.energia_p1 !== null) {
      // Fallback to P1 price if P3 not configured
      totalP3 = consumoP3 * adminTarifa.energia_p1;
    }
  }

  const totalEnergia = totalP1 + totalP2 + totalP3;
  const subtotal = totalPotencia + totalEnergia;

  // Taxes - use admin values or defaults
  const impuestoPct = adminTarifa.impuesto_electrico ?? 5.1127;
  const impuestoElectricidad = subtotal * (impuestoPct / 100);
  const subtotalConImpuesto = subtotal + impuestoElectricidad;
  
  const ivaPct = adminTarifa.iva ?? 21;
  const totalIVA = subtotalConImpuesto * (ivaPct / 100);
  
  const totalComparacion = subtotalConImpuesto + totalIVA;

  // ============================================
  // STEP 3: Calculate difference and message
  // ============================================
  const diferencia = totalActual - totalComparacion;

  let mensaje = "";
  if (diferencia >= 0) {
    mensaje = `Con ${empresaNombre} ahorrarías ${diferencia.toFixed(2)} €/mes.`;
  } else {
    mensaje = `Tu tarifa actual es más económica. Con ${empresaNombre} pagarías ${Math.abs(diferencia).toFixed(2)} €/mes más.`;
  }

  const detalle: CalculationDetail = {
    potencia: totalPotencia,
    energia_p1: totalP1,
    energia_p2: totalP2,
    energia_p3: totalP3,
    subtotal,
    impuesto: impuestoElectricidad,
    iva: totalIVA,
    total: totalComparacion
  };

  console.log('📊 NEW tariff calculation detail:', detalle);
  console.log('📈 RESULT: Actual:', totalActual.toFixed(2), '€ | Comparación:', totalComparacion.toFixed(2), '€ | Diferencia:', diferencia.toFixed(2), '€/mes');
  console.log('💬 Message:', mensaje);

  return {
    totalActual,
    totalComparacion,
    diferencia,
    empresaNombre,
    mensaje,
    detalle,
    missingAdminFields,
    missingOcrFields
  };
};

// ============================================
// LEGACY: CURRENT BILL CALCULATION (kept for compatibility)
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
// LEGACY: NEW TARIFF CALCULATION (kept for compatibility)
// Now uses the new non-blocking logic
// ============================================

export const calculateNewElectricityCost = (
  ocrData: OCRElectricityData,
  adminTarifa: TarifaElectricidad
): { total: number | null; breakdown: CalculationBreakdown | null; incomplete: boolean; reason: string | null } => {
  
  // Track missing fields but DON'T BLOCK
  const missing: string[] = [];
  if (adminTarifa.potencia_p1 === null) missing.push('potencia_p1');
  if (adminTarifa.energia_p1 === null) missing.push('energia_p1');
  
  console.log("Missing admin tariff values:", missing);

  const dias = ocrData.dias ?? 30;
  const potencia_kw = ocrData.potencia_kw ?? 4.6;
  const consumo_p1 = ocrData.consumo_p1_kwh ?? 0;
  const consumo_p2 = ocrData.consumo_p2_kwh ?? 0;
  const consumo_p3 = ocrData.consumo_p3_kwh ?? 0;

  // CRITICAL: Convert €/kW/año to €/kW/día
  const precioPotenciaDiario = (adminTarifa.potencia_p1 ?? 0) / 365;
  const potencia_cost = potencia_kw * dias * precioPotenciaDiario;
  
  // Energy - use only available prices
  const admin_energia_p1 = adminTarifa.energia_p1 ?? 0;
  const admin_energia_p2 = adminTarifa.energia_p2 ?? admin_energia_p1;
  const admin_energia_p3 = adminTarifa.energia_p3 ?? admin_energia_p1;
  const admin_impuesto = adminTarifa.impuesto_electrico ?? 5.1127;
  const admin_iva = adminTarifa.iva ?? 21;

  const energia_cost = (consumo_p1 * admin_energia_p1) + (consumo_p2 * admin_energia_p2) + (consumo_p3 * admin_energia_p3);
  const subtotal = potencia_cost + energia_cost;
  const impuesto_amount = subtotal * (admin_impuesto / 100);
  const subtotal_con_impuesto = subtotal + impuesto_amount;
  const iva_amount = subtotal_con_impuesto * (admin_iva / 100);
  const total = subtotal_con_impuesto + iva_amount;

  const breakdown: CalculationBreakdown = {
    potencia_cost, energia_cost, subtotal, impuesto_amount, subtotal_con_impuesto, iva_amount, total
  };

  console.log('📊 NEW tariff calculation:', { dias, potencia_kw, consumo_p1, precioPotenciaDiario, admin_energia_p1, total });

  return { total, breakdown, incomplete: false, reason: null };
};

// ============================================
// MAIN COMPARISON FUNCTION (updated to never block)
// ============================================

export const compareElectricityTariffs = (
  ocrData: OCRElectricityData,
  adminTarifa: TarifaElectricidad
): ComparisonResult => {
  
  console.log('═══════════════════════════════════════');
  console.log('🔄 ELECTRICITY COMPARISON START');

  // Use new non-blocking calculation
  const comparison = calculateElectricityComparison(ocrData, adminTarifa);

  const savingsMonth = comparison.diferencia;
  const savingsYear = savingsMonth * 12;

  // Create legacy breakdown for compatibility
  const newBreakdown: CalculationBreakdown = {
    potencia_cost: comparison.detalle.potencia,
    energia_cost: comparison.detalle.energia_p1 + comparison.detalle.energia_p2 + comparison.detalle.energia_p3,
    subtotal: comparison.detalle.subtotal,
    impuesto_amount: comparison.detalle.impuesto,
    subtotal_con_impuesto: comparison.detalle.subtotal + comparison.detalle.impuesto,
    iva_amount: comparison.detalle.iva,
    total: comparison.detalle.total
  };

  return {
    totalCurrent: comparison.totalActual,
    totalNew: comparison.totalComparacion,
    savingsMonth,
    savingsYear,
    currentBreakdown: null,
    newBreakdown,
    currentIncomplete: false,
    newIncomplete: false,
    incompleteReason: null,
    detalle: comparison.detalle,
    missingAdminFields: comparison.missingAdminFields
  };
};

// ============================================
// LEGACY FUNCTIONS
// ============================================

const DEFAULT_CONTRACTED_POWER = 4.6;

export const calculateMonthlyElectricityPrice = (consumoKwh: number, tarifa: TarifaElectricidad): number | null => {
  // Use only available values - don't block
  const energyPrice = tarifa.energia_p1 ?? 0;
  const powerPrice = (tarifa.potencia_p1 ?? 0) / 365; // Convert from €/kW/año to €/kW/día
  
  const energyCost = consumoKwh * energyPrice;
  const powerCost = powerPrice * 30 * DEFAULT_CONTRACTED_POWER;
  let subtotal = energyCost + powerCost;
  
  const impuesto = tarifa.impuesto_electrico ?? 5.1127;
  subtotal *= (1 + impuesto / 100);
  
  const iva = tarifa.iva ?? 21;
  subtotal *= (1 + iva / 100);
  
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
