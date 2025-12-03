import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Electricity extraction tool with extended fields for validation
const electricityTool = {
  type: "function",
  function: {
    name: "extract_invoice_data",
    description: "Extraer datos estructurados de una factura de electricidad española",
    parameters: {
      type: "object",
      properties: {
        consumo_kwh: {
          type: "number",
          description: "Consumo total mensual en kWh"
        },
        tarifa: {
          type: "string",
          description: "Nombre de la tarifa contratada"
        },
        cups: {
          type: "string",
          description: "Código CUPS (20-22 caracteres)"
        },
        empresa: {
          type: "string",
          description: "Nombre de la empresa proveedora"
        },
        precio_mensual: {
          type: "number",
          description: "Precio total mensual en euros"
        },
        potencia_kw: {
          type: "number",
          description: "Potencia contratada en kW"
        },
        // Extended fields for validation
        potencia_price: {
          type: "number",
          description: "Precio del término de potencia en €/kW/día"
        },
        potencia_days: {
          type: "number",
          description: "Número de días del periodo de facturación"
        },
        fecha_inicio: {
          type: "string",
          description: "Fecha de inicio del periodo de facturación (YYYY-MM-DD)"
        },
        fecha_fin: {
          type: "string",
          description: "Fecha de fin del periodo de facturación (YYYY-MM-DD)"
        },
        consumo_p1: {
          type: "number",
          description: "Consumo en periodo P1 (punta) en kWh"
        },
        consumo_p2: {
          type: "number",
          description: "Consumo en periodo P2 (llano) en kWh"
        },
        consumo_p3: {
          type: "number",
          description: "Consumo en periodo P3 (valle) en kWh"
        },
        energia_p1_price: {
          type: "number",
          description: "Precio energía P1 en €/kWh"
        },
        energia_p2_price: {
          type: "number",
          description: "Precio energía P2 en €/kWh"
        },
        energia_p3_price: {
          type: "number",
          description: "Precio energía P3 en €/kWh"
        },
        termino_potencia_euros: {
          type: "number",
          description: "Importe total del término de potencia en euros"
        },
        termino_energia_euros: {
          type: "number",
          description: "Importe total del término de energía en euros"
        },
        impuesto_electrico: {
          type: "number",
          description: "Porcentaje del impuesto eléctrico (normalmente 5.11%)"
        },
        iva: {
          type: "number",
          description: "Porcentaje de IVA aplicado (normalmente 21%)"
        }
      },
      required: ["consumo_kwh", "tarifa", "cups", "empresa", "precio_mensual"],
      additionalProperties: false
    }
  }
};

// Gas extraction tool with specific gas fields
const gasTool = {
  type: "function",
  function: {
    name: "extract_gas_invoice_data",
    description: "Extraer datos estructurados de una factura de gas natural",
    parameters: {
      type: "object",
      properties: {
        empresa: {
          type: "string",
          description: "Nombre de la empresa proveedora de gas"
        },
        termino_fijo: {
          type: "number",
          description: "Término fijo mensual en €/mes"
        },
        termino_variable: {
          type: "number",
          description: "Término variable en €/kWh"
        },
        lectura_anterior: {
          type: "number",
          description: "Lectura anterior del contador en m3"
        },
        lectura_actual: {
          type: "number",
          description: "Lectura actual del contador en m3"
        },
        factor_conversion: {
          type: "number",
          description: "Factor de conversión kWh/m3 (normalmente entre 10 y 12)"
        },
        tarifa_atr: {
          type: "string",
          description: "Tarifa de acceso ATR (TUR1, TUR2, RL.1, RL.2, etc.)"
        },
        iva: {
          type: "number",
          description: "Porcentaje de IVA aplicado (normalmente 21)"
        },
        consumo_m3: {
          type: "number",
          description: "Consumo en metros cúbicos"
        },
        consumo_kwh: {
          type: "number",
          description: "Consumo convertido a kWh"
        },
        precio_mensual: {
          type: "number",
          description: "Precio total de la factura en euros"
        },
        fecha_inicio: {
          type: "string",
          description: "Fecha de inicio del periodo de facturación"
        },
        fecha_fin: {
          type: "string",
          description: "Fecha de fin del periodo de facturación"
        },
        dias_periodo: {
          type: "number",
          description: "Días del periodo de facturación"
        }
      },
      required: ["empresa", "consumo_kwh", "precio_mensual"],
      additionalProperties: false
    }
  }
};

// Helper function to calculate days between two dates
function calculateDaysBetween(dateStart: string, dateEnd: string): number | null {
  try {
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  } catch {
    return null;
  }
}

// Apply fallback logic for electricity invoices
function applyElectricityFallbacks(data: any): { data: any; fallbacks: string[] } {
  const fallbacks: string[] = [];

  // A. DAYS - If missing, calculate from dates or use default 30
  if (!data.potencia_days || data.potencia_days === null) {
    if (data.fecha_inicio && data.fecha_fin) {
      const calculatedDays = calculateDaysBetween(data.fecha_inicio, data.fecha_fin);
      if (calculatedDays) {
        data.potencia_days = calculatedDays;
        fallbacks.push(`Días del periodo calculados de fechas: ${calculatedDays} días`);
      } else {
        data.potencia_days = 30;
        fallbacks.push("Días del periodo: 30 (ciclo estándar por defecto)");
      }
    } else {
      data.potencia_days = 30;
      fallbacks.push("Días del periodo: 30 (ciclo estándar por defecto)");
    }
  }

  // B. POWER (POTENCIA) - Estimate if missing
  if (!data.potencia_kw || data.potencia_kw === null) {
    if (data.termino_potencia_euros && data.potencia_price && data.potencia_days) {
      // potencia = (Término de potencia €) / (precio potencia €/kW·día × days)
      const estimatedPower = data.termino_potencia_euros / (data.potencia_price * data.potencia_days);
      if (estimatedPower > 0 && estimatedPower < 50) { // Sanity check
        data.potencia_kw = Math.round(estimatedPower * 100) / 100;
        fallbacks.push(`Potencia estimada: ${data.potencia_kw} kW (calculada del término de potencia)`);
      } else {
        data.potencia_kw = 4.6; // Common residential power
        fallbacks.push("Potencia contratada: 4.6 kW (residencial estándar)");
      }
    } else {
      data.potencia_kw = 4.6;
      fallbacks.push("Potencia contratada: 4.6 kW (residencial estándar)");
    }
  }

  // C. POWER PRICE - Set to 0 if missing (don't block calculation)
  if (!data.potencia_price || data.potencia_price === null) {
    data.potencia_price = 0;
    fallbacks.push("Precio potencia: no disponible (se usa 0)");
  }

  // D. ENERGY PRICE - Calculate from totals if missing
  if (!data.energia_p1_price || data.energia_p1_price === null) {
    if (data.termino_energia_euros && data.consumo_kwh && data.consumo_kwh > 0) {
      data.energia_p1_price = Math.round((data.termino_energia_euros / data.consumo_kwh) * 100000) / 100000;
      fallbacks.push(`Precio energía P1 calculado: ${data.energia_p1_price} €/kWh (total energía / consumo)`);
    }
  }

  // E. ENERGY CONSUMPTION - Use total as P1 if P1/P2/P3 missing
  if (!data.consumo_p1 || data.consumo_p1 === null) {
    if (data.consumo_kwh) {
      data.consumo_p1 = data.consumo_kwh;
      fallbacks.push(`Consumo P1 = consumo total: ${data.consumo_kwh} kWh`);
    }
  }

  // F. ELECTRICITY TAX - Default 5.1127%
  if (!data.impuesto_electrico || data.impuesto_electrico === null) {
    data.impuesto_electrico = 5.1127;
    fallbacks.push("Impuesto eléctrico: 5.1127% (por defecto)");
  }

  // G. IVA - Default 21%
  if (!data.iva || data.iva === null) {
    data.iva = 21;
    fallbacks.push("IVA: 21% (por defecto)");
  }

  return { data, fallbacks };
}

// Apply fallback logic for gas invoices
function applyGasFallbacks(data: any): { data: any; fallbacks: string[] } {
  const fallbacks: string[] = [];

  // Calculate days from dates if not present
  if (!data.dias_periodo || data.dias_periodo === null) {
    if (data.fecha_inicio && data.fecha_fin) {
      const calculatedDays = calculateDaysBetween(data.fecha_inicio, data.fecha_fin);
      if (calculatedDays) {
        data.dias_periodo = calculatedDays;
        fallbacks.push(`Días del periodo calculados: ${calculatedDays} días`);
      } else {
        data.dias_periodo = 30;
        fallbacks.push("Días del periodo: 30 (por defecto)");
      }
    } else {
      data.dias_periodo = 30;
      fallbacks.push("Días del periodo: 30 (por defecto)");
    }
  }

  // Calculate consumption in m3 if we have readings
  if (data.lectura_actual && data.lectura_anterior && (!data.consumo_m3 || data.consumo_m3 === null)) {
    data.consumo_m3 = data.lectura_actual - data.lectura_anterior;
    fallbacks.push(`Consumo m³ calculado: ${data.consumo_m3} m³ (lectura actual - anterior)`);
  }

  // Default conversion factor if not found
  if (!data.factor_conversion || data.factor_conversion === null) {
    data.factor_conversion = 11.0;
    fallbacks.push("Factor conversión: 11.0 kWh/m³ (por defecto)");
  }

  // Calculate consumption in kWh if we have m3 and conversion factor
  if (data.consumo_m3 && data.factor_conversion && (!data.consumo_kwh || data.consumo_kwh === null)) {
    data.consumo_kwh = data.consumo_m3 * data.factor_conversion;
    fallbacks.push(`Consumo kWh calculado: ${data.consumo_kwh} kWh (m³ × factor conversión)`);
  }

  // Default IVA if not found
  if (!data.iva || data.iva === null) {
    data.iva = 21;
    fallbacks.push("IVA: 21% (por defecto)");
  }

  return { data, fallbacks };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tariffType = formData.get("tariffType") as string || "electricity";
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "El archivo excede el límite de 10MB" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      return new Response(
        JSON.stringify({ error: "Tipo de archivo no permitido. Solo se aceptan PDF, JPG y PNG" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing file:", file.name, "Type:", file.type, "Tariff Type:", tariffType);

    // Convert file to base64 in chunks to avoid stack overflow
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    let binary = '';
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    
    const base64 = btoa(binary);
    
    // Determine mime type
    let mimeType = file.type;
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg'; // default
    }

    const imageUrl = `data:${mimeType};base64,${base64}`;

    // Choose prompt and tool based on tariff type
    const isGas = tariffType === "gas";
    
    const electricityPrompt = `Analiza esta factura de electricidad española y extrae la siguiente información:

CAMPOS PRINCIPALES:
- Consumo mensual total en kWh (busca "Consumo" o "kWh")
- Tarifa actual (nombre de la tarifa contratada)
- CUPS (Código Universal del Punto de Suministro - 20-22 caracteres alfanuméricos)
- Empresa proveedora
- Precio total mensual en euros (importe total factura)
- Potencia contratada en kW (busca en "Datos del contrato", "Término de potencia", "Potencia contratada")

CAMPOS DE FECHAS:
- Fecha de inicio del periodo de facturación (formato YYYY-MM-DD)
- Fecha de fin del periodo de facturación (formato YYYY-MM-DD)
- Número de días del periodo de facturación

CAMPOS DE POTENCIA:
- Precio del término de potencia (€/kW/día)
- Importe total del término de potencia en euros

CAMPOS DE CONSUMO Y ENERGÍA:
- Consumo en periodo P1 (punta) en kWh
- Consumo en periodo P2 (llano) en kWh
- Consumo en periodo P3 (valle) en kWh
- Precio energía P1 (€/kWh)
- Precio energía P2 (€/kWh)
- Precio energía P3 (€/kWh)
- Importe total del término de energía en euros

IMPUESTOS:
- Porcentaje del impuesto eléctrico (normalmente 5.11%)
- Porcentaje de IVA (normalmente 21%)

Si la factura solo muestra consumo total sin desglose P1/P2/P3, usa el consumo total como P1.
Si no encuentras algún dato, devuelve null para ese campo.`;

    const gasPrompt = `Analiza esta factura de GAS NATURAL española y extrae la siguiente información específica de gas:

CAMPOS REQUERIDOS:
- Empresa proveedora de gas
- Término fijo (€/mes) - busca "término fijo", "cargo fijo", "fijo mensual"
- Término variable (€/kWh) - busca "término variable", "precio kWh", "€/kWh"
- Lectura anterior del contador (m3) - busca "lectura anterior", "anterior"
- Lectura actual del contador (m3) - busca "lectura actual", "actual"
- Factor de conversión (kWh/m3) - normalmente entre 10 y 12, busca "factor conversión", "PCS"
- Tarifa ATR - busca "TUR1", "TUR2", "RL.1", "RL.2", "ATR", "tarifa acceso"
- IVA aplicado (porcentaje, normalmente 21%)
- Consumo en m3 (diferencia entre lecturas o valor indicado)
- Consumo en kWh (m3 × factor conversión o valor indicado)
- Precio total de la factura en euros

CAMPOS DE FECHAS:
- Fecha de inicio del periodo de facturación
- Fecha de fin del periodo de facturación
- Días del periodo de facturación

IMPORTANTE: 
- Busca palabras clave de gas: "m3", "metros cúbicos", "kWh/m3", "gas natural", "término fijo gas", "término variable gas"
- NO extraer campos de electricidad como CUPS, potencia P1/P2, impuesto eléctrico
- Si no encuentras algún dato, devuelve null para ese campo
- El factor de conversión típico es entre 10.5 y 11.5 kWh/m3`;

    const prompt = isGas ? gasPrompt : electricityPrompt;
    const tool = isGas ? gasTool : electricityTool;
    const toolName = isGas ? "extract_gas_invoice_data" : "extract_invoice_data";

    console.log("Calling Lovable AI for", isGas ? "GAS" : "ELECTRICITY", "data extraction");

    // Call Lovable AI with tool calling for structured extraction
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes alcanzado. Intenta de nuevo en unos momentos." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Contacta con soporte." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error al procesar la factura" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "No se pudieron extraer los datos de la factura" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Raw extracted data:", extractedData);

    // Store detected fields before applying fallbacks
    const detectedFields: string[] = [];
    const checkFields = isGas 
      ? ['empresa', 'consumo_kwh', 'consumo_m3', 'termino_fijo', 'termino_variable', 'lectura_anterior', 'lectura_actual', 'factor_conversion', 'iva', 'precio_mensual', 'tarifa_atr']
      : ['empresa', 'consumo_kwh', 'potencia_kw', 'potencia_price', 'potencia_days', 'consumo_p1', 'consumo_p2', 'energia_p1_price', 'energia_p2_price', 'impuesto_electrico', 'iva', 'precio_mensual'];
    
    for (const field of checkFields) {
      if (extractedData[field] !== null && extractedData[field] !== undefined) {
        detectedFields.push(field);
      }
    }

    // Apply fallback logic based on invoice type
    let fallbacks: string[] = [];
    if (isGas) {
      const result = applyGasFallbacks(extractedData);
      extractedData = result.data;
      fallbacks = result.fallbacks;
    } else {
      const result = applyElectricityFallbacks(extractedData);
      extractedData = result.data;
      fallbacks = result.fallbacks;
    }

    console.log("Processed extracted data:", extractedData);
    console.log("Detected fields:", detectedFields);
    console.log("Fallbacks applied:", fallbacks);

    // Validation warning for electricity invoices (informational only)
    let validationWarning: string | null = null;
    if (!isGas) {
      const requiredElectricityFields = [
        'potencia_price',
        'potencia_days', 
        'consumo_p1',
        'energia_p1_price',
        'impuesto_electrico',
        'iva'
      ];
      
      const originalMissing = requiredElectricityFields.filter(field => 
        !detectedFields.includes(field)
      );
      
      if (originalMissing.length > 0) {
        console.log("Electricity validation warning - originally missing fields:", originalMissing);
        validationWarning = "Algunos campos fueron estimados usando valores por defecto.";
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        tariffType: tariffType,
        validationWarning: validationWarning,
        detectedFields: detectedFields,
        fallbacksApplied: fallbacks
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in extract-invoice-data:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
