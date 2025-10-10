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

interface SyncStats {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

function sanitizeError(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('ftp') || message.includes('download')) {
    return 'Failed to fetch catalog data from supplier';
  }
  if (message.includes('insert') || message.includes('update') || message.includes('database')) {
    return 'Failed to update product database';
  }
  if (message.includes('parse') || message.includes('csv')) {
    return 'Failed to process catalog file';
  }
  return 'An error occurred during catalog sync';
}

function sanitizeCSVField(value: string): string {
  // Prevent CSV injection attacks
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  return value;
}

function validateCatalogItem(item: Partial<CatalogRow>): CatalogRow | null {
  // Validate part_number
  if (!item.part_number || item.part_number.length > 100) {
    console.warn('Invalid part_number:', item.part_number);
    return null;
  }
  
  // Sanitize and validate brand
  const brand = sanitizeCSVField((item.brand || '').substring(0, 100));
  
  // Validate stock
  const stock = parseInt(String(item.stock)) || 0;
  if (stock < 0 || stock > 1000000) {
    console.warn('Invalid stock value:', item.stock);
    return null;
  }
  
  // Validate price
  const price = parseFloat(String(item.price)) || 0;
  if (price < 0 || price > 1000000) {
    console.warn('Invalid price value:', item.price);
    return null;
  }
  
  // Validate and sanitize description
  const description = sanitizeCSVField(
    (item.description || '')
      .substring(0, 5000)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  );
  
  // Validate image_url
  let image_url = item.image_url || '';
  if (image_url) {
    try {
      const url = new URL(image_url);
      if (!['http:', 'https:'].includes(url.protocol) || 
          image_url.includes('javascript:') || 
          image_url.startsWith('data:')) {
        console.warn('Invalid image URL:', image_url);
        image_url = '';
      }
      image_url = image_url.substring(0, 500);
    } catch {
      console.warn('Malformed image URL:', image_url);
      image_url = '';
    }
  }
  
  return {
    part_number: sanitizeCSVField(item.part_number),
    brand,
    stock,
    price,
    description,
    image_url,
  };
}

async function downloadFromFTP(
  host: string,
  username: string,
  password: string,
  filePath: string
): Promise<string> {
  console.log(`Downloading from FTP: ${host}${filePath}`);
  
  const ftpUrl = `ftp://${username}:${encodeURIComponent(password)}@${host}${filePath}`;
  
  try {
    const response = await fetch(ftpUrl);
    if (!response.ok) {
      throw new Error(`FTP download failed: ${response.status}`);
    }
    const content = await response.text();
    
    // Check file size limit (10MB)
    const MAX_CSV_SIZE = 10 * 1024 * 1024;
    if (content.length > MAX_CSV_SIZE) {
      throw new Error('CSV file exceeds size limit');
    }
    
    console.log(`Downloaded ${content.length} bytes`);
    return content;
  } catch (error) {
    console.error(`FTP download error for ${filePath}:`, error);
    throw new Error(`Failed to download ${filePath}`);
  }
}

function parseCSV(csvContent: string): CatalogRow[] {
  console.log('Parsing CSV content...');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  const dataLines = lines.slice(1); // Skip header
  const records: CatalogRow[] = [];
  let skipped = 0;
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    const fields = line.split(';').map(f => f.trim().replace(/^"|"$/g, ''));
    
    if (fields.length >= 6) {
      const validatedItem = validateCatalogItem({
        part_number: fields[0] || '',
        brand: fields[1] || '',
        stock: parseInt(fields[2]) || 0,
        price: parseFloat(fields[3].replace(',', '.')) || 0,
        description: fields[4] || '',
        image_url: fields[5] || '',
      });
      
      if (validatedItem) {
        records.push(validatedItem);
      } else {
        skipped++;
      }
    }
  }
  
  if (skipped > 0) {
    console.log(`Skipped ${skipped} invalid records`);
  }
  
  console.log(`Parsed ${records.length} valid records from CSV`);
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let metricsId: string | null = null;

  try {
    console.log('syncElsiCatalog function invoked');
    
    // Verify JWT and check admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: isAdmin } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting
    const { data: syncState } = await supabase
      .from('sync_state')
      .select('last_run, in_progress')
      .eq('operation', 'sync_elsi_catalog')
      .maybeSingle();

    if (syncState) {
      if (syncState.in_progress) {
        return new Response(
          JSON.stringify({ error: "Sync already in progress" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lastRun = new Date(syncState.last_run);
      const now = new Date();
      const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / 1000 / 60;

      if (minutesSinceLastRun < 5) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            message: `Please wait ${Math.ceil(5 - minutesSinceLastRun)} minutes before syncing again`
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create metrics record
    const { data: metricsRecord } = await supabase
      .from('sync_metrics')
      .insert({
        operation: 'sync_elsi_catalog',
        started_at: new Date().toISOString(),
        status: 'in_progress',
        triggered_by: user.id
      })
      .select()
      .single();
    
    metricsId = metricsRecord?.id;

    // Set sync in progress
    await supabase
      .from('sync_state')
      .upsert({ 
        operation: 'sync_elsi_catalog', 
        in_progress: true,
        last_run: new Date().toISOString()
      });

    // FTP credentials
    const ftpHost = 'shop.elsi.es';
    const ftpUsername = 'elsitarifa1';
    const ftpPassword = Deno.env.get('ELSI_FTP_PASSWORD')!;

    // Download both catalog files
    console.log('Downloading both catalog files...');
    const [dailyContent, regularContent] = await Promise.all([
      downloadFromFTP(ftpHost, ftpUsername, ftpPassword, '/catalogo-elsi-diario.csv'),
      downloadFromFTP(ftpHost, ftpUsername, ftpPassword, '/catalogo-elsi.csv'),
    ]);
    
    // Parse both files
    const dailyRecords = parseCSV(dailyContent);
    const regularRecords = parseCSV(regularContent);
    
    // Merge records, preferring daily catalog (more recent data)
    const recordsMap = new Map<string, CatalogRow>();
    
    // Add regular catalog first
    for (const record of regularRecords) {
      recordsMap.set(record.part_number, record);
    }
    
    // Override with daily catalog (more recent)
    for (const record of dailyRecords) {
      recordsMap.set(record.part_number, record);
    }
    
    const mergedRecords = Array.from(recordsMap.values());
    console.log(`Merged ${mergedRecords.length} unique products from both catalogs`);
    
    if (mergedRecords.length === 0) {
      await logOperation(supabase, 'sync_elsi_catalog', 'warning', 'No records found in CSV files', 0);
      
      // Update metrics
      if (metricsId) {
        await supabase
          .from('sync_metrics')
          .update({
            completed_at: new Date().toISOString(),
            status: 'warning',
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
            error_message: 'No records found in CSV files'
          })
          .eq('id', metricsId);
      }
      
      return new Response(
        JSON.stringify({ message: 'No records to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Sync to products table using batch upsert
    console.log('Syncing products to database...');
    const stats: SyncStats = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    const productBatch = [];
    
    for (const item of mergedRecords) {
      try {
        if (!item.part_number) {
          stats.skipped++;
          continue;
        }

        const priceCents = Math.round(item.price * 100);

        productBatch.push({
          sku: item.part_number,
          title: item.description || item.part_number,
          description: item.description,
          brand: item.brand,
          stock: item.stock,
          price_cents: priceCents,
          currency: 'eur',
          image_url: item.image_url,
          active: true,
        });

      } catch (itemError) {
        console.error(`Error processing item ${item.part_number}:`, itemError);
        stats.errors++;
      }
    }

    // Perform batch upsert in chunks
    const batchSize = 500;
    let totalProcessed = 0;

    for (let i = 0; i < productBatch.length; i += batchSize) {
      const batch = productBatch.slice(i, i + batchSize);
      
      const { data: upsertedProducts, error: upsertError } = await supabase
        .from('products')
        .upsert(batch, { 
          onConflict: 'sku',
          ignoreDuplicates: false 
        })
        .select('sku');

      if (upsertError) {
        console.error(`Error in batch upsert (batch ${i / batchSize + 1}):`, upsertError);
        stats.errors += batch.length;
      } else {
        totalProcessed += upsertedProducts?.length || 0;
        console.log(`Processed batch ${i / batchSize + 1}, total: ${totalProcessed}`);
      }
    }

    stats.inserted = totalProcessed;
    stats.updated = totalProcessed;

    const message = `Successfully synced ${totalProcessed} products (${stats.errors} errors, ${stats.skipped} skipped)`;
    
    await logOperation(
      supabase,
      'sync_elsi_catalog',
      stats.errors > 0 ? 'partial_success' : 'success',
      message,
      totalProcessed
    );

    console.log('Catalog sync completed:', message);

    // Clear in_progress flag
    await supabase
      .from('sync_state')
      .update({ in_progress: false })
      .eq('operation', 'sync_elsi_catalog');

    // Update metrics
    if (metricsId) {
      await supabase
        .from('sync_metrics')
        .update({
          completed_at: new Date().toISOString(),
          status: stats.errors > 0 ? 'partial_success' : 'success',
          records_processed: totalProcessed,
          records_created: stats.inserted,
          records_updated: stats.updated,
          records_failed: stats.errors,
          duration_seconds: Math.round((Date.now() - startTime) / 1000)
        })
        .eq('id', metricsId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
        stats: {
          inserted: stats.inserted,
          updated: stats.updated,
          skipped: stats.skipped,
          errors: stats.errors,
        },
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in syncElsiCatalog:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = error instanceof Error ? sanitizeError(error) : 'An error occurred';
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logOperation(supabase, 'sync_elsi_catalog', 'error', errorMessage, 0);
      
      // Clear in_progress flag on error
      await supabase
        .from('sync_state')
        .update({ in_progress: false })
        .eq('operation', 'sync_elsi_catalog');
      
      // Update metrics
      if (metricsId) {
        await supabase
          .from('sync_metrics')
          .update({
            completed_at: new Date().toISOString(),
            status: 'error',
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
            error_message: errorMessage
          })
          .eq('id', metricsId);
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: userMessage,
        error_id: crypto.randomUUID()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
