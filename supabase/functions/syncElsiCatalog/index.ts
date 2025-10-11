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
  
  // First line is headers
  const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
  console.log(`CSV headers: ${headers.join(', ')}`);
  
  const products: Product[] = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length === headers.length) {
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });
      
      // Map CSV columns to our Product interface
      // Adjust these mappings based on actual CSV column names
      const product: Product = {
        brand: rowData['brand'] || rowData['marca'] || '',
        part_number: rowData['part_number'] || rowData['referencia'] || rowData['codigo'] || '',
        description: rowData['description'] || rowData['descripcion'] || '',
        description2: rowData['description2'] || rowData['descripcion2'] || '',
        barcode: rowData['barcode'] || rowData['ean'] || '',
        price: parseFloat(rowData['price'] || rowData['precio'] || '0'),
        stock: parseInt(rowData['stock'] || rowData['existencias'] || '0', 10),
        image_url: rowData['image_url'] || rowData['imagen'] || '',
      };
      
      products.push(product);
    }
  }
  
  console.log(`Parsed ${products.length} products from CSV`);
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

    if (!fullUrl || !dailyUrl) {
      throw new Error('Missing required environment variables: ELSI_FULL_URL or ELSI_DAILY_URL');
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

    // Return JSON response with UTF-8 encoding
    return new Response(
      JSON.stringify({
        success: true,
        count: mergedProducts.length,
        products: mergedProducts,
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
