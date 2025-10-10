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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(
        JSON.stringify({ message, stats: { updated: 0, created: 0, errors: 0, skipped: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Processing ${catalogItems.length} catalog items...`);
    
    const stats: ProductUpdateStats = {
      updated: 0,
      created: 0,
      errors: 0,
      skipped: 0,
    };

    // Process each catalog item
    for (const item of catalogItems as ElsiCatalogItem[]) {
      try {
        // Skip items without part number
        if (!item.part_number) {
          console.log('Skipping item without part_number');
          stats.skipped++;
          continue;
        }

        // Check if product exists by matching sku to part_number
        const { data: existingProducts, error: checkError } = await supabase
          .from('products')
          .select('id, sku, image_url')
          .eq('sku', item.part_number)
          .limit(1);

        if (checkError) {
          console.error(`Error checking product ${item.part_number}:`, checkError);
          stats.errors++;
          continue;
        }

        // Convert price to cents (assuming price is in euros)
        const priceCents = Math.round(item.price * 100);

        // Prepare product data
        const productData = {
          sku: item.part_number,
          title: item.description || item.part_number,
          description: item.description,
          brand: item.brand,
          stock: item.stock,
          price_cents: priceCents,
          currency: 'eur',
          image_url: item.image_url,
          active: true,
        };

        if (existingProducts && existingProducts.length > 0) {
          // Update existing product
          const existingProduct = existingProducts[0];
          
          // Only update image_url if it's different
          const updateData = {
            ...productData,
            image_url: item.image_url && item.image_url !== existingProduct.image_url 
              ? item.image_url 
              : existingProduct.image_url,
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', existingProduct.id);

          if (updateError) {
            console.error(`Error updating product ${item.part_number}:`, updateError);
            stats.errors++;
          } else {
            console.log(`Updated product: ${item.part_number}`);
            stats.updated++;
          }
        } else {
          // Create new product
          const { error: insertError } = await supabase
            .from('products')
            .insert([productData]);

          if (insertError) {
            console.error(`Error creating product ${item.part_number}:`, insertError);
            stats.errors++;
          } else {
            console.log(`Created new product: ${item.part_number}`);
            stats.created++;
          }
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.part_number}:`, itemError);
        stats.errors++;
      }
    }

    // Log success
    const totalProcessed = stats.updated + stats.created;
    const message = `Processed ${catalogItems.length} items: ${stats.created} created, ${stats.updated} updated, ${stats.errors} errors, ${stats.skipped} skipped`;
    
    await logOperation(
      supabase,
      'update_products',
      stats.errors > 0 ? 'partial_success' : 'success',
      message,
      totalProcessed
    );

    console.log('Product update completed:', message);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in updateProductsFromElsi:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = error instanceof Error ? sanitizeError(error) : 'An error occurred';
    
    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logOperation(supabase, 'update_products', 'error', errorMessage, 0);
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
