import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CatalogRow {
  part_number: string;
  brand: string;
  stock: number;
  price: number;
  description: string;
  image_url: string;
}

async function downloadFromFTP(
  host: string,
  username: string,
  password: string,
  filePath: string
): Promise<string> {
  console.log(`Attempting to download file from FTP: ${host}${filePath}`);
  
  // Note: Deno doesn't have native FTP support, so we'll use fetch with FTP URL
  // If the FTP server supports HTTP/HTTPS, we could use that instead
  // For production, consider using a dedicated FTP library or service
  
  const ftpUrl = `ftp://${username}:${encodeURIComponent(password)}@${host}${filePath}`;
  
  try {
    const response = await fetch(ftpUrl);
    if (!response.ok) {
      throw new Error(`FTP download failed: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('FTP download error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download file from FTP: ${errorMessage}`);
  }
}

function parseCSV(csvContent: string): CatalogRow[] {
  console.log('Parsing CSV content...');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Skip header row
  const dataLines = lines.slice(1);
  const records: CatalogRow[] = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle quoted fields with commas)
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    
    // Map fields to catalog row
    if (fields.length >= 6) {
      records.push({
        part_number: fields[0] || '',
        brand: fields[1] || '',
        stock: parseInt(fields[2]) || 0,
        price: parseFloat(fields[3]) || 0,
        description: fields[4] || '',
        image_url: fields[5] || '',
      });
    }
  }
  
  console.log(`Parsed ${records.length} records from CSV`);
  return records;
}

async function logOperation(
  supabase: any,
  operation: string,
  status: string,
  message: string,
  recordsProcessed: number = 0
) {
  const { error } = await supabase
    .from('elsi_logs')
    .insert({
      operation,
      status,
      message,
      records_processed: recordsProcessed,
    });
  
  if (error) {
    console.error('Failed to log operation:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('fetchElsiCatalog function invoked');
    
    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // FTP credentials
    const ftpHost = 'shop.elsi.es';
    const ftpUsername = 'elsitarifa1';
    const ftpPassword = Deno.env.get('ELSI_FTP_PASSWORD')!;
    const ftpFilePath = '/catalogo-elsi-diario.csv';

    // Download CSV from FTP
    console.log('Downloading CSV from FTP...');
    const csvContent = await downloadFromFTP(ftpHost, ftpUsername, ftpPassword, ftpFilePath);
    
    // Parse CSV
    const catalogRecords = parseCSV(csvContent);
    
    if (catalogRecords.length === 0) {
      await logOperation(supabase, 'fetch_catalog', 'warning', 'No records found in CSV', 0);
      return new Response(
        JSON.stringify({ message: 'No records to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Clear existing data
    console.log('Clearing existing catalog data...');
    const { error: deleteError } = await supabase
      .from('elsi_catalog_temp')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error('Error clearing catalog:', deleteError);
      await logOperation(supabase, 'fetch_catalog', 'error', `Failed to clear catalog: ${deleteError.message}`, 0);
      throw deleteError;
    }

    // Insert new data in batches
    console.log(`Inserting ${catalogRecords.length} records...`);
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < catalogRecords.length; i += batchSize) {
      const batch = catalogRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('elsi_catalog_temp')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        await logOperation(
          supabase,
          'fetch_catalog',
          'error',
          `Failed to insert batch: ${insertError.message}`,
          totalInserted
        );
        throw insertError;
      }

      totalInserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1}, total: ${totalInserted}`);
    }

    // Log success
    await logOperation(
      supabase,
      'fetch_catalog',
      'success',
      `Successfully updated catalog with ${totalInserted} records`,
      totalInserted
    );

    console.log('Catalog update completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${totalInserted} records`,
        records_processed: totalInserted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in fetchElsiCatalog:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logOperation(supabase, 'fetch_catalog', 'error', errorMessage, 0);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
