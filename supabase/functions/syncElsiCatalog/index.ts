import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  brand: string;
  part_number: string;
  description: string;
  description2: string;
  barcode: string;
  price: number;
  stock: number;
  image_url: string;
}

interface UpsertSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function fetchCSV(url: string): Promise<string> {
  console.log(`Fetching CSV from: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV from ${url}: ${response.status} ${response.statusText}`);
  }
  
  const content = await response.text();
  console.log(`Downloaded ${content.length} bytes from ${url}`);
  return content;
}

function parseCSV(csvContent: string): Product[] {
  console.log('Parsing CSV content...');
  const lines = csvContent.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  console.log(`Total lines in CSV: ${lines.length}`);
  
  // First line is headers - normalize and clean
  const headerLine = lines[0];
  const headers = headerLine.split(';').map(h => 
    h.trim()
      .replace(/^"|"$/g, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
  );
  
  console.log(`CSV headers (${headers.length} columns): ${headers.join(', ')}`);
  
  const products: Product[] = [];
  let skippedRows = 0;
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      skippedRows++;
      continue;
    }
    
    const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length !== headers.length) {
      console.log(`Skipping row ${i}: column count mismatch (expected ${headers.length}, got ${values.length})`);
      skippedRows++;
      continue;
    }
    
    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index];
    });
    
    // Map Spanish CSV columns to Product interface
    const partNumber = rowData['part number'] || rowData['partnumber'] || rowData['codigo articulo'] || '';
    
    // Skip rows without part_number
    if (!partNumber) {
      skippedRows++;
      continue;
    }
    
    const product: Product = {
      brand: rowData['marca'] || '',
      part_number: partNumber,
      description: rowData['descripcion'] || '',
      description2: rowData['descripcion 2'] || '',
      barcode: rowData['cod. barras'] || rowData['barcode'] || '',
      price: parseFloat(rowData['precio'] || '0'),
      stock: parseInt(rowData['stock'] || '0', 10),
      image_url: rowData['fotografia'] || rowData['imagen'] || '',
    };
    
    products.push(product);
  }
  
  console.log(`Parsed ${products.length} products from CSV (skipped ${skippedRows} rows)`);
  
  if (products.length > 0) {
    console.log('First 2 products:', JSON.stringify(products.slice(0, 2), null, 2));
  }
  
  return products;
}

function mergeProducts(fullProducts: Product[], dailyProducts: Product[]): Product[] {
  console.log(`Merging ${fullProducts.length} full products with ${dailyProducts.length} daily products`);
  
  // Create a map of full products by part_number
  const productMap = new Map<string, Product>();
  
  fullProducts.forEach(product => {
    if (product.part_number) {
      productMap.set(product.part_number, product);
    }
  });
  
  // Overwrite with daily products
  dailyProducts.forEach(product => {
    if (product.part_number) {
      productMap.set(product.part_number, product);
    }
  });
  
  const mergedProducts = Array.from(productMap.values());
  console.log(`Merged result: ${mergedProducts.length} products`);
  
  return mergedProducts;
}

async function upsertProductsToDatabase(
  products: Product[],
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<UpsertSummary> {
  console.log(`Starting upsert of ${products.length} products to database...`);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const summary: UpsertSummary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  // Fetch existing products to determine insert vs update
  const { data: existingProducts, error: fetchError } = await supabase
    .from('products')
    .select('sku, id');

  if (fetchError) {
    console.error('Error fetching existing products:', fetchError);
    throw new Error(`Failed to fetch existing products: ${fetchError.message}`);
  }

  const existingSkuMap = new Map(existingProducts?.map(p => [p.sku, p.id]) || []);
  console.log(`Found ${existingSkuMap.size} existing products in database`);

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    for (const product of batch) {
      try {
        // Skip products without part_number
        if (!product.part_number) {
          summary.skipped++;
          continue;
        }

        const sku = product.part_number;
        const existingId = existingSkuMap.get(sku);
        const priceCents = Math.round(product.price * 100);

        if (existingId) {
          // UPDATE: Only update price, stock, and image_url (preserve manual edits)
          const { error: updateError } = await supabase
            .from('products')
            .update({
              price_cents: priceCents,
              stock: product.stock,
              image_url: product.image_url || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingId);

          if (updateError) {
            console.error(`Error updating product ${sku}:`, updateError);
            summary.errors++;
          } else {
            summary.updated++;
          }
        } else {
          // INSERT: Create new product with all data from CSV
          const { error: insertError } = await supabase
            .from('products')
            .insert({
              sku: sku,
              title: product.description || product.part_number,
              description: product.description2 || product.description || null,
              price_cents: priceCents,
              currency: 'eur',
              stock: product.stock,
              image_url: product.image_url || null,
              category: null, // Will be set manually in Admin
              brand: product.brand || null,
              tags: null,
              active: true // New products are active by default
            });

          if (insertError) {
            console.error(`Error inserting product ${sku}:`, insertError);
            summary.errors++;
          } else {
            summary.inserted++;
          }
        }
      } catch (error) {
        console.error(`Error processing product:`, error);
        summary.errors++;
      }
    }

    // Log progress
    console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`);
  }

  console.log(`Upsert complete - Inserted: ${summary.inserted}, Updated: ${summary.updated}, Skipped: ${summary.skipped}, Errors: ${summary.errors}`);
  return summary;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting ELSI catalog sync...');

    // Get HTTPS URLs from environment
    const fullUrl = Deno.env.get('ELSI_FULL_URL');
    const dailyUrl = Deno.env.get('ELSI_DAILY_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!fullUrl || !dailyUrl) {
      throw new Error('Missing required environment variables: ELSI_FULL_URL or ELSI_DAILY_URL');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    console.log('Fetching full catalog...');
    const fullCSV = await fetchCSV(fullUrl);
    const fullProducts = parseCSV(fullCSV);

    console.log('Fetching daily catalog...');
    const dailyCSV = await fetchCSV(dailyUrl);
    const dailyProducts = parseCSV(dailyCSV);

    // Merge products (daily overwrites full)
    const mergedProducts = mergeProducts(fullProducts, dailyProducts);

    console.log(`Successfully processed ${mergedProducts.length} products`);

    // Upsert products to database
    const summary = await upsertProductsToDatabase(
      mergedProducts,
      supabaseUrl,
      supabaseServiceKey
    );

    // Return JSON response with UTF-8 encoding
    return new Response(
      JSON.stringify({
        success: true,
        count: mergedProducts.length,
        inserted: summary.inserted,
        updated: summary.updated,
        skipped: summary.skipped,
        errors: summary.errors,
        products: mergedProducts.slice(0, 10), // Return only first 10 for preview
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json; charset=utf-8' 
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in syncElsiCatalog:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json; charset=utf-8' 
        },
        status: 500,
      }
    );
  }
});
