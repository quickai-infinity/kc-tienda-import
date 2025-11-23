interface TarifaElectricidad {
  potencia_p1: number | null;
  potencia_p2: number | null;
  energia_p1: number | null;
  energia_p2: number | null;
  energia_p3: number | null;
  impuesto_electrico: number | null;
  iva: number | null;
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

export const formatCurrency = (value: number): string => {
  return value.toFixed(2).replace(".", ",");
};
