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
        consumo_p1: {
          type: "number",
          description: "Consumo en periodo P1 (punta) en kWh"
        },
        consumo_p2: {
          type: "number",
          description: "Consumo en periodo P2 (llano) en kWh"
        },
        energia_p1_price: {
          type: "number",
          description: "Precio energía P1 en €/kWh"
        },
        energia_p2_price: {
          type: "number",
          description: "Precio energía P2 en €/kWh"
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
        }
      },
      required: ["empresa", "consumo_kwh", "precio_mensual"],
      additionalProperties: false
    }
  }
};

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
- Precio mensual total en euros
- Potencia contratada en kW

CAMPOS ADICIONALES PARA VALIDACIÓN (si están disponibles):
- Precio del término de potencia (€/kW/día)
- Número de días del periodo de facturación
- Consumo en periodo P1 (punta) en kWh
- Consumo en periodo P2 (llano) en kWh
- Precio energía P1 (€/kWh)
- Precio energía P2 (€/kWh)
- Porcentaje del impuesto eléctrico (normalmente 5.11%)
- Porcentaje de IVA (normalmente 21%)

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

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", extractedData);

    // Validation for electricity invoices only
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
      
      const missingFields = requiredElectricityFields.filter(field => 
        extractedData[field] === null || extractedData[field] === undefined
      );
      
      if (missingFields.length > 0) {
        console.log("Electricity validation warning - missing fields:", missingFields);
        validationWarning = "Revisa los datos extraídos. Algunos campos no coinciden con una factura eléctrica estándar.";
      }
    }

    // For gas invoices, calculate derived fields if not present
    if (isGas) {
      // Calculate consumption in m3 if we have readings
      if (extractedData.lectura_actual && extractedData.lectura_anterior && !extractedData.consumo_m3) {
        extractedData.consumo_m3 = extractedData.lectura_actual - extractedData.lectura_anterior;
      }
      
      // Calculate consumption in kWh if we have m3 and conversion factor
      if (extractedData.consumo_m3 && extractedData.factor_conversion && !extractedData.consumo_kwh) {
        extractedData.consumo_kwh = extractedData.consumo_m3 * extractedData.factor_conversion;
      }
      
      // Default IVA if not found
      if (!extractedData.iva) {
        extractedData.iva = 21;
      }
      
      // Default conversion factor if not found
      if (!extractedData.factor_conversion) {
        extractedData.factor_conversion = 11.0;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        tariffType: tariffType,
        validationWarning: validationWarning
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
