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

function sanitizeError(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('ftp') || message.includes('download')) {
    return 'Failed to fetch catalog data from supplier';
  }
  if (message.includes('insert') || message.includes('update') || message.includes('database')) {
    return 'Failed to update catalog database';
  }
  if (message.includes('parse') || message.includes('csv')) {
    return 'Failed to process catalog file';
  }
  return 'An error occurred during catalog sync';
}

// Sanitize CSV fields to prevent formula injection
function sanitizeCSVField(value: string): string {
  if (!value) return value;
  // Prefix with single quote if starts with formula characters
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  return value;
}

function validateCatalogItem(item: Partial<CatalogRow>): CatalogRow | null {
  // Validate and sanitize part_number (prevent CSV injection)
  if (!item.part_number || item.part_number.length > 100) {
    return null;
  }
  const part_number = sanitizeCSVField(item.part_number);
  
  // Validate brand
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
  const description = sanitizeCSVField((item.description || '')
    .substring(0, 5000)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;'));
  
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
    part_number,
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
  console.log(`Attempting to download file from FTP: ${host}${filePath}`);
  
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
    
    console.log(`Downloaded ${content.length} bytes from FTP`);
    return content;
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`FTP download failed [${errorId}]`);
    throw new Error('Failed to download catalog file');
  }
}

function parseCSV(csvContent: string): CatalogRow[] {
  console.log('Parsing CSV content...');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  const dataLines = lines.slice(1);
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
    console.log('fetchElsiCatalog function invoked');
    
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

    // Check rate limiting with database-level locking
    const { data: syncState, error: lockError } = await supabase
      .rpc('get_sync_state_with_lock', { operation_name: 'fetch_catalog' });

    if (lockError) {
      // If we can't get the lock, another sync is in progress
      return new Response(
        JSON.stringify({ error: "Sync already in progress" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (syncState && syncState.length > 0) {
      const state = syncState[0];
      if (state.in_progress) {
        return new Response(
          JSON.stringify({ error: "Sync already in progress" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (state.last_run) {
        const lastRunTime = new Date(state.last_run).getTime();
        const nowTime = Date.now();
        const minutesSinceLastRun = (nowTime - lastRunTime) / 1000 / 60;

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
    }

    // Create metrics record
    const { data: metricsRecord } = await supabase
      .from('sync_metrics')
      .insert({
        operation: 'fetch_catalog',
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
        operation: 'fetch_catalog', 
        in_progress: true,
        last_run: new Date().toISOString()
      });

    // FTP credentials
    const ftpHost = 'shop.elsi.es';
    const ftpUsername = 'elsitarifa1';
    const ftpPassword = Deno.env.get('ELSI_FTP_PASSWORD')!;
    const ftpFilePath = '/catalogo-elsi-diario.csv';

    console.log('Downloading CSV from FTP...');
    const csvContent = await downloadFromFTP(ftpHost, ftpUsername, ftpPassword, ftpFilePath);
    
    const catalogRecords = parseCSV(csvContent);
    
    if (catalogRecords.length === 0) {
      await logOperation(supabase, 'fetch_catalog', 'warning', 'No records found in CSV', 0);
      
      // Update metrics
      if (metricsId) {
        await supabase
          .from('sync_metrics')
          .update({
            completed_at: new Date().toISOString(),
            status: 'warning',
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
            error_message: 'No records found in CSV'
          })
          .eq('id', metricsId);
      }
      
      return new Response(
        JSON.stringify({ message: 'No records to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Clearing existing catalog data...');
    const { error: deleteError } = await supabase
      .from('elsi_catalog_temp')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      const errorId = crypto.randomUUID();
      console.error(`Database clear failed [${errorId}]`);
      await logOperation(supabase, 'fetch_catalog', 'error', 'Failed to clear catalog', 0);
      throw new Error('Database operation failed');
    }

    console.log(`Inserting ${catalogRecords.length} records in optimized batches...`);
    // Optimized: Larger batches for faster imports
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < catalogRecords.length; i += batchSize) {
      const batch = catalogRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('elsi_catalog_temp')
        .insert(batch);

      if (insertError) {
        const errorId = crypto.randomUUID();
        console.error(`Batch insert failed [${errorId}] - batch ${i / batchSize + 1}`);
        await logOperation(
          supabase,
          'fetch_catalog',
          'error',
          `Failed to insert batch`,
          totalInserted
        );
        throw new Error('Database operation failed');
      }

      totalInserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1}, total: ${totalInserted}`);
    }

    await logOperation(
      supabase,
      'fetch_catalog',
      'success',
      `Successfully updated catalog with ${totalInserted} records`,
      totalInserted
    );

    console.log('Catalog update completed successfully');

    // Clear in_progress flag
    await supabase
      .from('sync_state')
      .update({ in_progress: false })
      .eq('operation', 'fetch_catalog');

    // Update metrics
    if (metricsId) {
      await supabase
        .from('sync_metrics')
        .update({
          completed_at: new Date().toISOString(),
          status: 'success',
          records_processed: totalInserted,
          duration_seconds: Math.round((Date.now() - startTime) / 1000)
        })
        .eq('id', metricsId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${totalInserted} records`,
        records_processed: totalInserted,
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`Operation failed [${errorId}]`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = error instanceof Error ? sanitizeError(error) : 'An error occurred';
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logOperation(supabase, 'fetch_catalog', 'error', errorMessage, 0);
      
      // Clear in_progress flag on error
      await supabase
        .from('sync_state')
        .update({ in_progress: false })
        .eq('operation', 'fetch_catalog');
      
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
