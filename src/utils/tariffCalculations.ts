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

/**
 * Calculate CURRENT cost using INVOICE subtotals
 * IMPORTANT: Use termino_potencia_euros directly, NOT potencia_kw * days * potencia_price
 * because OCR may extract incorrect power price from "€/kW y año" format
 */
export const calculateCurrentElectricityCost = (data: ElectricityInvoiceData): number => {
  // Power cost: USE THE SUBTOTAL FROM INVOICE DIRECTLY (reliable)
  // Do NOT calculate from potencia_kw * days * potencia_price (unreliable)
  const powerCostCurrent = data.termino_potencia_euros;

  // Energy cost from invoice prices
  const energyCostCurrent =
    (data.consumo_p1_kwh * data.energia_p1_price) +
    (data.consumo_p2_kwh * data.energia_p2_price) +
    (data.consumo_p3_kwh * data.energia_p3_price);

  const subtotalCurrent = powerCostCurrent + energyCostCurrent;

  // Apply taxes
  const taxFactor = 1 + (data.impuesto_electrico_pct / 100);
  const vatFactor = 1 + (data.iva_pct / 100);

  return subtotalCurrent * taxFactor * vatFactor;
};

/**
 * Calculate NEW cost using ADMIN TARIFF prices with same consumption/power from invoice
 */
export const calculateNewElectricityCost = (
  data: ElectricityInvoiceData,
  adminTarifa: TarifaElectricidad
): number | null => {
  // If admin tariff doesn't have energy price, can't calculate
  if (!adminTarifa.energia_p1) {
    return null;
  }

  // Power cost using admin tariff P1
  const adminPotenciaP1 = adminTarifa.potencia_p1 || 0;
  const powerCostNew = data.potencia_kw * data.days * adminPotenciaP1;

  // Energy cost using admin tariff prices
  const adminEnergiaP1 = adminTarifa.energia_p1 || 0;
  const adminEnergiaP2 = adminTarifa.energia_p2 || 0;
  const adminEnergiaP3 = adminTarifa.energia_p3 || 0;

  const energyCostNew =
    (data.consumo_p1_kwh * adminEnergiaP1) +
    (data.consumo_p2_kwh * adminEnergiaP2) +
    (data.consumo_p3_kwh * adminEnergiaP3);

  const subtotalNew = powerCostNew + energyCostNew;

  // Apply admin taxes
  const adminImpuesto = adminTarifa.impuesto_electrico || 5.1127; // default 5.1127%
  const adminIva = adminTarifa.iva || 21; // default 21%

  const taxFactorNew = 1 + (adminImpuesto / 100);
  const vatFactorNew = 1 + (adminIva / 100);

  return subtotalNew * taxFactorNew * vatFactorNew;
};

/**
 * Compare electricity invoice with admin tariff and return savings
 */
export const compareElectricityTariffs = (
  invoiceData: ElectricityInvoiceData,
  adminTarifa: TarifaElectricidad
): { savingsMonth: number; savingsYear: number; totalCurrent: number; totalNew: number | null } => {
  const totalCurrent = calculateCurrentElectricityCost(invoiceData);
  const totalNew = calculateNewElectricityCost(invoiceData, adminTarifa);

  if (totalNew === null) {
    return { savingsMonth: 0, savingsYear: 0, totalCurrent, totalNew: null };
  }

  const savingsMonth = totalCurrent - totalNew;

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
