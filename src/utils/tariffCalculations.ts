interface TarifaElectricidad {
  potencia_p1: number | null;
  potencia_p2: number | null;
  energia_p1: number | null;
  energia_p2: number | null;
  energia_p3: number | null;
  impuesto_electrico: number | null;
  iva: number | null;
}

interface TarifaGas {
  termino_fijo: number | null;
  termino_variable: number | null;
  iva: number | null;
}

// Invoice extracted data for electricity comparison
export interface ElectricityInvoiceData {
  days: number;
  potencia_kw: number;
  potencia_price: number; // €/kW día (may be unreliable)
  termino_potencia_euros: number; // Subtotal from invoice "Término de potencia" - USE THIS
  consumo_p1_kwh: number;
  consumo_p2_kwh: number;
  consumo_p3_kwh: number;
  energia_p1_price: number; // €/kWh
  energia_p2_price: number;
  energia_p3_price: number;
  impuesto_electrico_pct: number;
  iva_pct: number;
}

const DEFAULT_CONTRACTED_POWER = 4.6; // kW

export const calculateMonthlyElectricityPrice = (
  consumoKwh: number,
  tarifa: TarifaElectricidad
): number | null => {
  // If no energy price configured, can't calculate
  if (!tarifa.energia_p1) {
    return null;
  }

  // 1. Calculate energy cost (using P1 as default)
  const energyCost = consumoKwh * tarifa.energia_p1;

  // 2. Calculate power cost (monthly)
  let powerCost = 0;
  if (tarifa.potencia_p1) {
    // potencia_p1 is €/kW/day, so multiply by 30 days and contracted power
    powerCost = tarifa.potencia_p1 * 30 * DEFAULT_CONTRACTED_POWER;
  }

  // 3. Subtotal
  let subtotal = energyCost + powerCost;

  // 4. Apply electric tax (impuesto eléctrico)
  if (tarifa.impuesto_electrico) {
    subtotal = subtotal * (1 + tarifa.impuesto_electrico / 100);
  }

  // 5. Apply IVA
  if (tarifa.iva) {
    subtotal = subtotal * (1 + tarifa.iva / 100);
  }

  return subtotal;
};

export const calculateMonthlyGasPrice = (
  consumoKwh: number,
  tarifa: TarifaGas
): number | null => {
  // If no variable price configured, can't calculate
  if (!tarifa.termino_variable) {
    return null;
  }

  // 1. Calculate variable cost
  const variableCost = consumoKwh * tarifa.termino_variable;

  // 2. Add fixed term (monthly)
  let subtotal = variableCost;
  if (tarifa.termino_fijo) {
    subtotal += tarifa.termino_fijo;
  }

  // 3. Apply IVA
  if (tarifa.iva) {
    subtotal = subtotal * (1 + tarifa.iva / 100);
  }

  return subtotal;
};

// Invoice extracted data for electricity comparison - SIMPLIFIED
export interface SimpleElectricityData {
  precio_mensual: number;      // Invoice total - USE THIS AS CURRENT COST
  potencia_kw: number;         // For new tariff calculation
  days: number;                // For new tariff calculation  
  consumo_p1_kwh: number;      // For new tariff calculation
  consumo_p2_kwh: number;      // Optional
  consumo_p3_kwh: number;      // Optional
}

/**
 * SIMPLIFIED: Calculate CURRENT cost = invoice total (precio_mensual)
 * DO NOT recalculate from extracted prices - they are unreliable
 */
export const calculateCurrentElectricityCost = (data: ElectricityInvoiceData | SimpleElectricityData): number => {
  // If we have precio_mensual, use it directly (most reliable)
  if ('precio_mensual' in data && data.precio_mensual > 0) {
    console.log('✅ Using precio_mensual directly:', data.precio_mensual);
    return data.precio_mensual;
  }
  
  // Fallback: calculate from invoice components (less reliable)
  const fullData = data as ElectricityInvoiceData;
  const powerCostCurrent = fullData.termino_potencia_euros || 0;
  
  if (powerCostCurrent === 0) {
    console.warn('⚠️ Power subtotal (termino_potencia_euros) is 0 - current power cost will be 0');
  }

  const energyCostCurrent =
    (fullData.consumo_p1_kwh * fullData.energia_p1_price) +
    (fullData.consumo_p2_kwh * fullData.energia_p2_price) +
    (fullData.consumo_p3_kwh * fullData.energia_p3_price);

  const subtotalCurrent = powerCostCurrent + energyCostCurrent;
  const taxFactor = 1 + (fullData.impuesto_electrico_pct / 100);
  const vatFactor = 1 + (fullData.iva_pct / 100);

  return subtotalCurrent * taxFactor * vatFactor;
};

/**
 * Calculate NEW cost using ADMIN TARIFF prices ONLY
 * Uses invoice consumption data (kW, days, kWh) with admin tariff prices
 * 
 * Formula:
 * potencia_cost = potencia_kw × days × potencia_p1_admin
 * energia_cost = consumo_p1 × energia_p1_admin (+ P2/P3 if applicable)
 * subtotal = potencia_cost + energia_cost
 * impuesto = subtotal × (impuesto_electrico_admin / 100)
 * total = (subtotal + impuesto) × (1 + iva_admin / 100)
 */
export const calculateNewElectricityCost = (
  data: ElectricityInvoiceData | SimpleElectricityData,
  adminTarifa: TarifaElectricidad
): number | null => {
  // CRITICAL: If admin tariff doesn't have potencia_p1, tariff is INCOMPLETE
  if (adminTarifa.potencia_p1 === null || adminTarifa.potencia_p1 === undefined) {
    console.warn('⚠️ Admin tariff INCOMPLETE: potencia_p1 is null');
    return null;
  }
  
  // If admin tariff doesn't have energy price, can't calculate
  if (!adminTarifa.energia_p1) {
    console.warn('⚠️ Admin tariff missing energia_p1');
    return null;
  }

  // Extract consumption data
  const potencia_kw = data.potencia_kw || 4.6;
  const days = data.days || 30;
  const consumo_p1 = data.consumo_p1_kwh || 0;
  const consumo_p2 = data.consumo_p2_kwh || 0;
  const consumo_p3 = data.consumo_p3_kwh || 0;

  // Admin tariff values ONLY - potencia_p1 is already validated above
  const adminPotenciaP1 = adminTarifa.potencia_p1;
  const adminEnergiaP1 = adminTarifa.energia_p1;
  const adminEnergiaP2 = adminTarifa.energia_p2 || 0;
  const adminEnergiaP3 = adminTarifa.energia_p3 || 0;
  const adminImpuesto = adminTarifa.impuesto_electrico || 5.1127;
  const adminIva = adminTarifa.iva || 21;

  // Step 1: Power cost
  const potencia_cost = potencia_kw * days * adminPotenciaP1;
  
  // Step 2: Energy cost (use P1 price for all if P2/P3 not configured)
  const energia_cost = 
    (consumo_p1 * adminEnergiaP1) +
    (consumo_p2 * (adminEnergiaP2 || adminEnergiaP1)) +
    (consumo_p3 * (adminEnergiaP3 || adminEnergiaP1));
  
  // Step 3: Subtotal
  const subtotal = potencia_cost + energia_cost;
  
  // Step 4: Impuesto eléctrico
  const impuesto = subtotal * (adminImpuesto / 100);
  
  // Step 5: Subtotal + impuesto
  const subtotal_with_impuesto = subtotal + impuesto;
  
  // Step 6: IVA
  const total_new = subtotal_with_impuesto * (1 + adminIva / 100);

  console.log('📊 NEW tariff calculation:', {
    potencia_kw,
    days,
    consumo_p1,
    adminPotenciaP1,
    adminEnergiaP1,
    potencia_cost: potencia_cost.toFixed(2),
    energia_cost: energia_cost.toFixed(2),
    subtotal: subtotal.toFixed(2),
    impuesto: impuesto.toFixed(2),
    subtotal_with_impuesto: subtotal_with_impuesto.toFixed(2),
    total_new: total_new.toFixed(2)
  });

  return total_new;
};

/**
 * Compare electricity: CURRENT (invoice total) vs NEW (admin tariff calculation)
 * 
 * CURRENT = precio_mensual from invoice (direct total)
 * NEW = calculated using ONLY admin tariff values
 * SAVINGS = CURRENT - NEW
 */
export const compareElectricityTariffs = (
  invoiceData: ElectricityInvoiceData | SimpleElectricityData,
  adminTarifa: TarifaElectricidad,
  precioMensualFactura?: number
): { savingsMonth: number; savingsYear: number; totalCurrent: number; totalNew: number | null } => {
  
  // CURRENT: Use invoice total (precio_mensual) directly
  let totalCurrent: number;
  if (precioMensualFactura && precioMensualFactura > 0) {
    totalCurrent = precioMensualFactura;
    console.log('✅ Using precio_mensual from invoice:', totalCurrent);
  } else {
    totalCurrent = calculateCurrentElectricityCost(invoiceData);
    console.log('⚠️ Calculated current cost (fallback):', totalCurrent);
  }
  
  // NEW: Calculate using admin tariff ONLY
  const totalNew = calculateNewElectricityCost(invoiceData, adminTarifa);

  console.log('📈 Comparison:', {
    totalCurrent: totalCurrent.toFixed(2),
    totalNew: totalNew?.toFixed(2) || 'N/A'
  });

  if (totalNew === null) {
    return { savingsMonth: 0, savingsYear: 0, totalCurrent, totalNew: null };
  }

  const savingsMonth = totalCurrent - totalNew;

  console.log('💰 Savings calculation:', {
    savingsMonth: savingsMonth.toFixed(2),
    savingsYear: (savingsMonth * 12).toFixed(2)
  });

  // Treat very small differences as zero (floating point noise)
  if (savingsMonth > 0.01) {
    return {
      savingsMonth,
      savingsYear: savingsMonth * 12,
      totalCurrent,
      totalNew
    };
  } else {
    return {
      savingsMonth: 0,
      savingsYear: 0,
      totalCurrent,
      totalNew
    };
  }
};

export const formatCurrency = (value: number): string => {
  return value.toFixed(2).replace(".", ",");
};
