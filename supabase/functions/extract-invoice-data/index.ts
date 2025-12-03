import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * ELECTRICITY INVOICE OCR EXTRACTION
 * ===================================
 * 
 * CRITICAL RULES:
 * 1. Extract ONLY what appears in the invoice
 * 2. If a field is not found → return null (NEVER invent or assume)
 * 3. NEVER convert null to 0
 * 4. NEVER generate fallback values
 * 5. Preserve original units (€/kW/día vs €/kW/mes)
 */

// Electricity extraction tool - all fields optional except minimum identifiers
const electricityTool = {
  type: "function",
  function: {
    name: "extract_invoice_data",
    description: "Extraer datos de factura eléctrica española. Solo extraer lo que aparece en la factura. Si un campo no existe, devolver null.",
    parameters: {
      type: "object",
      properties: {
        // Invoice identification
        empresa: {
          type: ["string", "null"],
          description: "Nombre de la empresa proveedora de electricidad"
        },
        cups: {
          type: ["string", "null"],
          description: "Código CUPS (20-22 caracteres). Si no aparece, devolver null"
        },
        tarifa: {
          type: ["string", "null"],
          description: "Nombre de la tarifa contratada (ej: 2.0TD, PVPC)"
        },
        
        // Invoice total - MOST IMPORTANT
        precio_mensual: {
          type: ["number", "null"],
          description: "Importe TOTAL de la factura en euros. Buscar 'Total factura', 'Importe total', 'Total a pagar'"
        },
        
        // Period
        fecha_inicio: {
          type: ["string", "null"],
          description: "Fecha inicio periodo facturación (YYYY-MM-DD). Si no aparece, null"
        },
        fecha_fin: {
          type: ["string", "null"],
          description: "Fecha fin periodo facturación (YYYY-MM-DD). Si no aparece, null"
        },
        potencia_days: {
          type: ["number", "null"],
          description: "Días del periodo de facturación. Si no aparece explícitamente, null"
        },
        
        // Power (Potencia)
        potencia_kw: {
          type: ["number", "null"],
          description: "Potencia contratada en kW. Buscar en 'Datos del contrato', 'Potencia contratada'"
        },
        potencia_price: {
          type: ["number", "null"],
          description: "Precio potencia en €/kW/día. IMPORTANTE: verificar si es €/kW/día o €/kW/mes"
        },
        potencia_price_unit: {
          type: ["string", "null"],
          description: "Unidad del precio de potencia: 'dia' o 'mes'. Esto es CRÍTICO para cálculos correctos"
        },
        termino_potencia_euros: {
          type: ["number", "null"],
          description: "Importe total del término de potencia en euros (subtotal). Buscar 'Término de potencia', 'Por potencia contratada'"
        },
        
        // Consumption
        consumo_kwh: {
          type: ["number", "null"],
          description: "Consumo TOTAL en kWh del periodo"
        },
        consumo_p1: {
          type: ["number", "null"],
          description: "Consumo periodo P1 (punta) en kWh. Si no hay desglose, null"
        },
        consumo_p2: {
          type: ["number", "null"],
          description: "Consumo periodo P2 (llano) en kWh. Si no hay desglose, null"
        },
        consumo_p3: {
          type: ["number", "null"],
          description: "Consumo periodo P3 (valle) en kWh. Si no hay desglose, null"
        },
        
        // Energy prices
        energia_p1_price: {
          type: ["number", "null"],
          description: "Precio energía P1 en €/kWh. Solo si aparece explícitamente"
        },
        energia_p2_price: {
          type: ["number", "null"],
          description: "Precio energía P2 en €/kWh. Solo si aparece explícitamente"
        },
        energia_p3_price: {
          type: ["number", "null"],
          description: "Precio energía P3 en €/kWh. Solo si aparece explícitamente"
        },
        termino_energia_euros: {
          type: ["number", "null"],
          description: "Importe total del término de energía en euros (subtotal)"
        },
        
        // Taxes
        impuesto_electrico: {
          type: ["number", "null"],
          description: "Porcentaje del impuesto eléctrico. Solo si aparece explícitamente"
        },
        iva: {
          type: ["number", "null"],
          description: "Porcentaje de IVA aplicado. Solo si aparece explícitamente"
        }
      },
      required: ["empresa", "precio_mensual"],
      additionalProperties: false
    }
  }
};

// Gas extraction tool
const gasTool = {
  type: "function",
  function: {
    name: "extract_gas_invoice_data",
    description: "Extraer datos de factura de gas natural. Solo extraer lo que aparece. Si no existe, devolver null.",
    parameters: {
      type: "object",
      properties: {
        empresa: {
          type: ["string", "null"],
          description: "Nombre de la empresa proveedora de gas"
        },
        termino_fijo: {
          type: ["number", "null"],
          description: "Término fijo mensual en €/mes"
        },
        termino_variable: {
          type: ["number", "null"],
          description: "Término variable en €/kWh"
        },
        lectura_anterior: {
          type: ["number", "null"],
          description: "Lectura anterior del contador en m3"
        },
        lectura_actual: {
          type: ["number", "null"],
          description: "Lectura actual del contador en m3"
        },
        factor_conversion: {
          type: ["number", "null"],
          description: "Factor de conversión kWh/m3"
        },
        tarifa_atr: {
          type: ["string", "null"],
          description: "Tarifa ATR (TUR1, TUR2, RL.1, etc.)"
        },
        iva: {
          type: ["number", "null"],
          description: "Porcentaje de IVA"
        },
        consumo_m3: {
          type: ["number", "null"],
          description: "Consumo en metros cúbicos"
        },
        consumo_kwh: {
          type: ["number", "null"],
          description: "Consumo en kWh"
        },
        precio_mensual: {
          type: ["number", "null"],
          description: "Precio total de la factura"
        },
        fecha_inicio: {
          type: ["string", "null"],
          description: "Fecha inicio periodo"
        },
        fecha_fin: {
          type: ["string", "null"],
          description: "Fecha fin periodo"
        },
        dias_periodo: {
          type: ["number", "null"],
          description: "Días del periodo"
        }
      },
      required: ["empresa", "precio_mensual"],
      additionalProperties: false
    }
  }
};

// Calculate days between dates (helper - ONLY used for informational purposes)
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

/**
 * Process extracted data - MINIMAL fallbacks
 * 
 * ONLY the following automatic calculations are allowed:
 * 1. Calculate days from dates IF both dates are present
 * 2. Use consumo_kwh as consumo_p1 IF no P1/P2/P3 breakdown exists
 * 
 * ALL OTHER FIELDS must remain null if not extracted
 */
function processElectricityData(data: any): { data: any; detectedFields: string[]; estimatedFields: string[] } {
  const detectedFields: string[] = [];
  const estimatedFields: string[] = [];
  
  // Track which fields were actually detected in the invoice
  const allFields = [
    'empresa', 'cups', 'tarifa', 'precio_mensual',
    'fecha_inicio', 'fecha_fin', 'potencia_days',
    'potencia_kw', 'potencia_price', 'potencia_price_unit', 'termino_potencia_euros',
    'consumo_kwh', 'consumo_p1', 'consumo_p2', 'consumo_p3',
    'energia_p1_price', 'energia_p2_price', 'energia_p3_price', 'termino_energia_euros',
    'impuesto_electrico', 'iva'
  ];
  
  for (const field of allFields) {
    if (data[field] !== null && data[field] !== undefined) {
      detectedFields.push(field);
    }
  }

  // ALLOWED CALCULATION 1: Days from dates
  if ((data.potencia_days === null || data.potencia_days === undefined) && 
      data.fecha_inicio && data.fecha_fin) {
    const calculatedDays = calculateDaysBetween(data.fecha_inicio, data.fecha_fin);
    if (calculatedDays !== null) {
      data.potencia_days = calculatedDays;
      estimatedFields.push(`Días calculados de fechas: ${calculatedDays}`);
    }
  }

  // ALLOWED CALCULATION 2: consumo_p1 = consumo_kwh if no breakdown
  if ((data.consumo_p1 === null || data.consumo_p1 === undefined) && 
      data.consumo_kwh !== null && data.consumo_kwh !== undefined) {
    data.consumo_p1 = data.consumo_kwh;
    estimatedFields.push(`Consumo P1 = consumo total: ${data.consumo_kwh} kWh`);
  }

  // Convert potencia_price from €/kW/mes to €/kW/día if needed
  if (data.potencia_price !== null && data.potencia_price_unit === 'mes') {
    const originalPrice = data.potencia_price;
    data.potencia_price = data.potencia_price / 30;
    estimatedFields.push(`Precio potencia convertido: ${originalPrice} €/kW/mes → ${data.potencia_price.toFixed(6)} €/kW/día`);
  }

  console.log('📋 Processed electricity data:', {
    detected: detectedFields,
    estimated: estimatedFields
  });

  return { data, detectedFields, estimatedFields };
}

function processGasData(data: any): { data: any; detectedFields: string[]; estimatedFields: string[] } {
  const detectedFields: string[] = [];
  const estimatedFields: string[] = [];
  
  const allFields = [
    'empresa', 'termino_fijo', 'termino_variable',
    'lectura_anterior', 'lectura_actual', 'factor_conversion',
    'tarifa_atr', 'iva', 'consumo_m3', 'consumo_kwh',
    'precio_mensual', 'fecha_inicio', 'fecha_fin', 'dias_periodo'
  ];
  
  for (const field of allFields) {
    if (data[field] !== null && data[field] !== undefined) {
      detectedFields.push(field);
    }
  }

  // Calculate days from dates if not present
  if ((data.dias_periodo === null || data.dias_periodo === undefined) && 
      data.fecha_inicio && data.fecha_fin) {
    const calculatedDays = calculateDaysBetween(data.fecha_inicio, data.fecha_fin);
    if (calculatedDays !== null) {
      data.dias_periodo = calculatedDays;
      estimatedFields.push(`Días calculados de fechas: ${calculatedDays}`);
    }
  }

  // Calculate consumo_m3 from readings if not present
  if ((data.consumo_m3 === null || data.consumo_m3 === undefined) &&
      data.lectura_actual !== null && data.lectura_anterior !== null) {
    data.consumo_m3 = data.lectura_actual - data.lectura_anterior;
    estimatedFields.push(`Consumo m³ calculado: ${data.consumo_m3}`);
  }

  // Calculate consumo_kwh from m3 and factor if not present
  if ((data.consumo_kwh === null || data.consumo_kwh === undefined) &&
      data.consumo_m3 !== null && data.factor_conversion !== null) {
    data.consumo_kwh = data.consumo_m3 * data.factor_conversion;
    estimatedFields.push(`Consumo kWh calculado: ${data.consumo_kwh}`);
  }

  return { data, detectedFields, estimatedFields };
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tariffType = formData.get("tariffType") as string || "electricity";
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "El archivo excede el límite de 10MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      return new Response(
        JSON.stringify({ error: "Tipo de archivo no permitido. Solo PDF, JPG, PNG" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing file:", file.name, "Type:", file.type, "Tariff:", tariffType);

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    let binary = '';
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    
    const base64 = btoa(binary);
    
    let mimeType = file.type;
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    const imageUrl = `data:${mimeType};base64,${base64}`;
    const isGas = tariffType === "gas";
    
    // CRITICAL: Prompt emphasizes extracting ONLY what exists
    const electricityPrompt = `Analiza esta factura de ELECTRICIDAD española.

REGLAS CRÍTICAS:
1. Extrae ÚNICAMENTE los datos que aparecen en la factura
2. Si un campo NO aparece → devuelve null (NO inventes valores)
3. NUNCA asumas valores por defecto
4. Verifica las UNIDADES del precio de potencia: ¿es €/kW/día o €/kW/mes?

CAMPOS A BUSCAR:
- empresa: nombre del proveedor de electricidad
- cups: código CUPS (20-22 caracteres)
- tarifa: nombre de la tarifa (2.0TD, PVPC, etc.)
- precio_mensual: IMPORTE TOTAL de la factura (buscar "Total factura", "Total a pagar")
- fecha_inicio, fecha_fin: periodo de facturación
- potencia_days: días del periodo (si aparece explícitamente)
- potencia_kw: potencia contratada en kW
- potencia_price: precio del término de potencia (verificar si es €/kW/día o €/kW/mes)
- potencia_price_unit: "dia" o "mes" según las unidades mostradas
- termino_potencia_euros: importe total del término de potencia
- consumo_kwh: consumo total en kWh
- consumo_p1, consumo_p2, consumo_p3: desglose por periodos (si existe)
- energia_p1_price, energia_p2_price, energia_p3_price: precios €/kWh por periodo
- termino_energia_euros: importe total del término de energía
- impuesto_electrico: porcentaje del impuesto eléctrico
- iva: porcentaje de IVA

Si NO encuentras un dato, devuelve null para ese campo.`;

    const gasPrompt = `Analiza esta factura de GAS NATURAL española.

REGLAS CRÍTICAS:
1. Extrae ÚNICAMENTE los datos que aparecen en la factura
2. Si un campo NO aparece → devuelve null
3. NUNCA inventes valores

CAMPOS A BUSCAR:
- empresa: proveedor de gas
- termino_fijo: €/mes
- termino_variable: €/kWh
- lectura_anterior, lectura_actual: lecturas del contador en m³
- factor_conversion: kWh/m³
- tarifa_atr: TUR1, TUR2, RL.1, etc.
- iva: porcentaje
- consumo_m3, consumo_kwh
- precio_mensual: total factura
- fecha_inicio, fecha_fin
- dias_periodo

Si NO encuentras un dato, devuelve null.`;

    const prompt = isGas ? gasPrompt : electricityPrompt;
    const tool = isGas ? gasTool : electricityTool;
    const toolName = isGas ? "extract_gas_invoice_data" : "extract_invoice_data";

    console.log("Calling AI for", isGas ? "GAS" : "ELECTRICITY", "extraction");

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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
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
          JSON.stringify({ error: "Límite de solicitudes alcanzado. Intenta de nuevo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Contacta con soporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error al procesar la factura" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    console.log("AI Response:", JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "No se pudieron extraer los datos de la factura" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Raw extracted data:", extractedData);

    // Process data with minimal calculations
    let detectedFields: string[] = [];
    let estimatedFields: string[] = [];
    
    if (isGas) {
      const result = processGasData(extractedData);
      extractedData = result.data;
      detectedFields = result.detectedFields;
      estimatedFields = result.estimatedFields;
    } else {
      const result = processElectricityData(extractedData);
      extractedData = result.data;
      detectedFields = result.detectedFields;
      estimatedFields = result.estimatedFields;
    }

    console.log("Final processed data:", extractedData);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        tariffType: tariffType,
        detectedFields: detectedFields,
        fallbacksApplied: estimatedFields,
        validationWarning: null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-invoice-data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
