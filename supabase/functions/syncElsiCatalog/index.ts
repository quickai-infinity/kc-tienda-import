const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  [key: string]: string;
}

async function downloadFromFTP(
  host: string,
  username: string,
  password: string,
  filePath: string
): Promise<string> {
  console.log(`Downloading from FTP: ${host}${filePath}`);
  
  const ftpUrl = `ftp://${username}:${encodeURIComponent(password)}@${host}${filePath}`;
  
  const response = await fetch(ftpUrl);
  if (!response.ok) {
    throw new Error(`FTP download failed with status: ${response.status}`);
  }
  
  const content = await response.text();
  console.log(`Downloaded ${content.length} bytes`);
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
  const products: Product[] = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length === headers.length) {
      const product: Product = {};
      headers.forEach((header, index) => {
        product[header] = values[index];
      });
      products.push(product);
    }
  }
  
  console.log(`Parsed ${products.length} products from CSV`);
  return products;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting ELSI catalog sync...');

    // Get FTP credentials from environment
    const ftpHost = Deno.env.get('FTP_HOST');
    const ftpUser = Deno.env.get('FTP_USER');
    const ftpPassword = Deno.env.get('FTP_PASSWORD');
    const ftpPathDiario = Deno.env.get('FTP_PATH_DIARIO');

    if (!ftpHost || !ftpUser || !ftpPassword || !ftpPathDiario) {
      throw new Error('Missing required FTP environment variables');
    }

    // Download the CSV file from FTP
    const csvContent = await downloadFromFTP(
      ftpHost,
      ftpUser,
      ftpPassword,
      ftpPathDiario
    );

    // Parse CSV to JSON
    const products = parseCSV(csvContent);

    console.log(`Successfully processed ${products.length} products`);

    // Return JSON response with UTF-8 encoding
    return new Response(
      JSON.stringify({
        success: true,
        count: products.length,
        products: products,
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
