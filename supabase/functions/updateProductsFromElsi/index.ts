import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ElsiCatalogItem {
  id: string;
  part_number: string;
  brand: string | null;
  stock: number;
  price: number;
  description: string | null;
  image_url: string | null;
}

interface ProductUpdateStats {
  updated: number;
  created: number;
  errors: number;
  skipped: number;
}

function sanitizeError(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('insert') || message.includes('update') || message.includes('database')) {
    return 'Failed to update product database';
  }
  if (message.includes('catalog') || message.includes('fetch')) {
    return 'Failed to fetch catalog data';
  }
  return 'An error occurred during product sync';
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
    console.log('updateProductsFromElsi function invoked');
    
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
      .eq('operation', 'update_products')
      .single();

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
        operation: 'update_products',
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
        operation: 'update_products', 
        in_progress: true,
        last_run: new Date().toISOString()
      });

    // Fetch all items from elsi_catalog_temp
    console.log('Fetching catalog items from elsi_catalog_temp...');
    const { data: catalogItems, error: fetchError } = await supabase
      .from('elsi_catalog_temp')
      .select('*');

    if (fetchError) {
      console.error('Error fetching catalog items:', fetchError);
      await logOperation(supabase, 'update_products', 'error', 'Failed to fetch catalog', 0);
      throw new Error('Database operation failed');
    }

    if (!catalogItems || catalogItems.length === 0) {
      const message = 'No items found in elsi_catalog_temp';
      console.log(message);
      await logOperation(supabase, 'update_products', 'warning', message, 0);
      
      if (metricsId) {
        await supabase
          .from('sync_metrics')
          .update({
            completed_at: new Date().toISOString(),
            status: 'warning',
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
            error_message: message
          })
          .eq('id', metricsId);
      }
      
      return new Response(
        JSON.stringify({ message, stats: { updated: 0, created: 0, errors: 0, skipped: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Processing ${catalogItems.length} catalog items with optimized batch upsert...`);
    
    const stats: ProductUpdateStats = {
      updated: 0,
      created: 0,
      errors: 0,
      skipped: 0,
    };

    // Optimized: Batch upsert instead of individual operations
    const productBatch = [];
    
    for (const item of catalogItems as ElsiCatalogItem[]) {
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

    // Perform batch upsert (update on conflict)
    if (productBatch.length > 0) {
      const { data: upsertedProducts, error: upsertError } = await supabase
        .from('products')
        .upsert(productBatch, { 
          onConflict: 'sku',
          ignoreDuplicates: false 
        })
        .select('id, sku');

      if (upsertError) {
        console.error('Error in batch upsert:', upsertError);
        stats.errors += productBatch.length;
      } else {
        // All records were upserted successfully
        stats.updated = upsertedProducts?.length || 0;
        stats.created = stats.updated; // Can't distinguish in upsert
      }
    }

    const totalProcessed = stats.updated + stats.created;
    const message = `Processed ${catalogItems.length} items: ${stats.created} created/updated, ${stats.errors} errors, ${stats.skipped} skipped`;
    
    await logOperation(
      supabase,
      'update_products',
      stats.errors > 0 ? 'partial_success' : 'success',
      message,
      totalProcessed
    );

    console.log('Product update completed:', message);

    // Clear in_progress flag
    await supabase
      .from('sync_state')
      .update({ in_progress: false })
      .eq('operation', 'update_products');

    // Update metrics
    if (metricsId) {
      await supabase
        .from('sync_metrics')
        .update({
          completed_at: new Date().toISOString(),
          status: stats.errors > 0 ? 'partial_success' : 'success',
          records_processed: totalProcessed,
          records_created: stats.created,
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
        stats,
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in updateProductsFromElsi:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = error instanceof Error ? sanitizeError(error) : 'An error occurred';
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logOperation(supabase, 'update_products', 'error', errorMessage, 0);
      
      // Clear in_progress flag on error
      await supabase
        .from('sync_state')
        .update({ in_progress: false })
        .eq('operation', 'update_products');
      
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
