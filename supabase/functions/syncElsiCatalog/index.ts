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
  category: string;
  name: string;
}

interface UpsertSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  categoriesCreated: number;
  categoriesReused: number;
}

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

// Utility functions
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')       // Replace &nbsp; with space
    .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
    .trim();
}

function normalizeCategoryText(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    // Capitalize first letter of each word
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function createSlug(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

async function findOrCreateCategory(
  supabase: any,
  categoryName: string,
  categoryCache: Map<string, CategoryInfo>
): Promise<CategoryInfo | null> {
  if (!categoryName) return null;
  
  // Check cache first
  if (categoryCache.has(categoryName)) {
    return categoryCache.get(categoryName)!;
  }
  
  const slug = createSlug(categoryName);
  
  // Try to find existing category
  const { data: existing, error: findError } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();
  
  if (findError) {
    console.error(`Error finding category ${categoryName}:`, findError);
    return null;
  }
  
  if (existing) {
    categoryCache.set(categoryName, existing);
    return existing;
  }
  
  // Create new category
  const { data: newCategory, error: insertError } = await supabase
    .from('categories')
    .insert({
      name: categoryName,
      slug: slug,
      description: 'Categoría importada automáticamente desde el catálogo ELSI'
    })
    .select('id, name, slug')
    .single();
  
  if (insertError) {
    console.error(`Error creating category ${categoryName}:`, insertError);
    return null;
  }
  
  if (newCategory) {
    categoryCache.set(categoryName, newCategory);
  }
  
  return newCategory;
}

function buildHierarchicalCategory(rowData: Record<string, string>): string {
  const parts: string[] = [];
  
  // Priority 1: Nombre de familia (main category)
  const familia = normalizeCategoryText(
    rowData['Nombre de familia'] ||
    rowData['Nombre De Familia'] ||
    rowData['familia'] ||
    rowData['Familia'] ||
    ''
  );
  
  // Priority 2: Subfamilia
  const subfamilia = normalizeCategoryText(
    rowData['Subfamilia'] ||
    rowData['subfamilia'] ||
    rowData['Nombre subfamilia'] ||
    rowData['Nombre Subfamilia'] ||
    ''
  );
  
  // Priority 3: Categoría
  const categoria = normalizeCategoryText(
    rowData['Categoría'] ||
    rowData['Categoria'] ||
    rowData['categoria'] ||
    ''
  );
  
  if (familia) parts.push(familia);
  if (subfamilia && subfamilia !== familia) parts.push(subfamilia);
  if (categoria && categoria !== subfamilia && categoria !== familia) parts.push(categoria);
  
  return parts.length > 0 ? parts.join(' / ') : '';
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

function validateImageUrl(url: string): string | null {
  if (!url || url.trim() === '') return null;
  
  const trimmedUrl = url.trim();
  
  // If it's already a full URL, validate it
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    // Check if it contains ELSI logo or placeholder patterns
    const lowerUrl = trimmedUrl.toLowerCase();
    if (lowerUrl.includes('logo')) {
      return null;
    }
    if (lowerUrl.includes('placeholder') || lowerUrl.includes('no-image')) {
      return null;
    }
    return trimmedUrl;
  }
  
  // If it's a relative path, prepend ELSI shop base URL
  if (trimmedUrl.length > 0 && !trimmedUrl.startsWith('http')) {
    return `https://shop.elsi.es/${trimmedUrl}`;
  }
  
  return null;
}

function normalizeCategory(category: string): string {
  if (!category) return '';
  // Capitalize first letter of each word
  return category
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function detectCategoryFromDescription(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('monitor') || desc.includes('pantalla')) {
    return 'Monitores';
  }
  if (desc.includes('impresora') || desc.includes('etiqueta')) {
    return 'Impresoras y Etiquetado';
  }
  if (desc.includes('scanner') || desc.includes('lector') || desc.includes('codigo') || desc.includes('código')) {
    return 'Lectores de Códigos';
  }
  if (desc.includes('batería') || desc.includes('bateria') || desc.includes('cable') || desc.includes('adaptador')) {
    return 'Accesorios';
  }
  if (desc.includes('teclado') || desc.includes('ratón') || desc.includes('raton') || desc.includes('mouse')) {
    return 'Periféricos';
  }
  if (desc.includes('software') || desc.includes('licencia')) {
    return 'Software';
  }
  
  return '';
}

function assignCategory(rowData: Record<string, string>): string {
  // Build hierarchical category from ELSI columns
  const hierarchical = buildHierarchicalCategory(rowData);
  
  if (hierarchical) {
    return hierarchical;
  }
  
  // Fallback: Auto-detect from descripción
  const description = 
    rowData['Descripción'] ||
    rowData['descripcion'] || 
    rowData['descripción'] || 
    '';
  
  if (description) {
    const detected = detectCategoryFromDescription(description);
    return detected ? normalizeCategoryText(detected) : '';
  }
  
  return '';
}

function parseCSV(csvContent: string): Product[] {
  console.log('Parsing CSV content...');
  const lines = csvContent.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  console.log(`Total lines in CSV: ${lines.length}`);
  
  // First line is headers - keep original case but normalize
  const headerLine = lines[0];
  const headers = headerLine.split(';').map(h => 
    h.trim()
      .replace(/^"|"$/g, '')
      .replace(/\s+/g, ' ')
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
    
    // Map Spanish CSV columns to Product interface (exact ELSI column names)
    const partNumber = normalizeText(
      rowData['Part number'] || 
      rowData['part number'] || 
      rowData['partnumber'] || 
      rowData['Part Number'] ||
      rowData['codigo'] ||
      rowData['ref'] ||
      ''
    );
    
    // Skip rows without part_number
    if (!partNumber) {
      skippedRows++;
      continue;
    }
    
    // Extract and validate image URL from multiple possible columns
    const rawImageUrl = 
      rowData['Fotografía'] ||
      rowData['fotografia'] ||
      rowData['Fotografia'] ||
      rowData['imagen'] || 
      rowData['urlimagen'] || 
      rowData['url_imagen'] || 
      rowData['image'] || 
      '';
    const validatedImageUrl = validateImageUrl(rawImageUrl);
    
    // Map ELSI CSV fields to Product interface with exact column names
    const product: Product = {
      name: normalizeText(
        rowData['Descripción'] ||
        rowData['descripcion'] || 
        rowData['Descripcion'] ||
        rowData['descripcion_principal'] || 
        rowData['descripcionprincipal'] ||
        rowData['titulo'] ||
        ''
      ) || 'Sin nombre',
      brand: normalizeText(
        rowData['Marca'] ||
        rowData['marca'] || 
        rowData['fabricante'] || 
        ''
      ),
      part_number: partNumber,
      description: normalizeText(
        rowData['Descripción 2'] ||
        rowData['descripcion 2'] ||
        rowData['Descripcion 2'] ||
        rowData['descripcion2'] ||
        rowData['descripcion_secundaria'] || 
        rowData['descripcionsecundaria'] ||
        rowData['descripcionlarga'] ||
        rowData['caracteristicas'] ||
        ''
      ),
      description2: normalizeText(
        rowData['Descripción 2'] ||
        rowData['descripcion 2'] ||
        rowData['descripcion_secundaria'] || 
        ''
      ),
      barcode: normalizeText(
        rowData['cod. barras'] || 
        rowData['barcode'] || 
        rowData['codigo_barras'] || 
        ''
      ),
      price: parseFloat(
        (rowData['Precio'] || rowData['precio'] || rowData['precio_base'] || rowData['price'] || '0')
          .replace(',', '.')
          .replace(/[^\d.]/g, '')
      ),
      stock: parseInt(
        rowData['Stock'] || rowData['stock'] || rowData['disponible'] || '0', 
        10
      ),
      image_url: validatedImageUrl || '',
      category: assignCategory(rowData),
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
    errors: 0,
    categoriesCreated: 0,
    categoriesReused: 0
  };
  
  // Category cache to avoid repeated lookups
  const categoryCache = new Map<string, CategoryInfo>();
  
  // Pre-load existing categories
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id, name, slug');
  
  if (existingCategories) {
    existingCategories.forEach((cat: CategoryInfo) => {
      categoryCache.set(cat.name, cat);
    });
    console.log(`Pre-loaded ${existingCategories.length} existing categories`);
  }

  // Fetch existing products to determine insert vs update (include image_url to preserve manual uploads)
  const { data: existingProducts, error: fetchError } = await supabase
    .from('products')
    .select('sku, id, image_url');

  if (fetchError) {
    console.error('Error fetching existing products:', fetchError);
    throw new Error(`Failed to fetch existing products: ${fetchError.message}`);
  }

  const existingProductMap = new Map(existingProducts?.map(p => [p.sku, { id: p.id, image_url: p.image_url }]) || []);
  console.log(`Found ${existingProductMap.size} existing products in database`);

  let featuredCount = 0;
  const featuredKeywords = ['promoción', 'promocion', 'oferta', 'nuevo'];
  
  // Track category distribution
  const categoryCount = new Map<string, number>();
  
  // Track image statistics
  let productsWithValidImages = 0;
  let manualImagesPreserved = 0;

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
        const existingProduct = existingProductMap.get(sku);
        
        // Handle category assignment
        let categoryId: string | null = null;
        const categoryName = product.category;
        
        if (categoryName) {
          const existingCategoryCount = categoryCache.size;
          const categoryInfo = await findOrCreateCategory(supabase, categoryName, categoryCache);
          
          if (categoryInfo) {
            categoryId = categoryInfo.id;
            // Track if we created a new category
            if (categoryCache.size > existingCategoryCount) {
              summary.categoriesCreated++;
            } else {
              summary.categoriesReused++;
            }
          }
        }
        
        // Price calculations:
        // 1. Base price from CSV (in cents)
        const priceBaseCents = Math.round(product.price * 100);
        
        // 2. Apply 16% profit margin
        const priceWithMargin = priceBaseCents * 1.16;
        
        // 3. Apply 21% VAT
        const priceFinalCents = Math.round(priceWithMargin * 1.21);

        if (existingProduct) {
          // UPDATE: Only update price, stock, and image_url
          // Preserve manually uploaded images (don't overwrite if CSV image is empty/invalid)
          const shouldUpdateImage = product.image_url && (!existingProduct.image_url || !existingProduct.image_url.includes('supabase'));
          
          if (!shouldUpdateImage && existingProduct.image_url) {
            manualImagesPreserved++;
          }
          
          const updateData: any = {
            price_base: priceBaseCents,
            price_cents: priceFinalCents,
            stock: product.stock,
            category: categoryName || null,
            category_id: categoryId,
            updated_at: new Date().toISOString()
          };
          
          // Only update image_url if we have a valid one and it's not a manual upload
          if (shouldUpdateImage) {
            updateData.image_url = product.image_url;
            if (product.image_url) {
              productsWithValidImages++;
            }
          }
          
          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', existingProduct.id);

          if (updateError) {
            console.error(`Error updating product ${sku}:`, updateError);
            summary.errors++;
          } else {
            summary.updated++;
          }
        } else {
          // INSERT: Create new product with all data from CSV
          // Determine if product should be featured:
          // - First 12 new products OR
          // - Category contains promotional keywords
          const categoryLower = (product.category || '').toLowerCase();
          const isFeatured = 
            featuredCount < 12 || 
            featuredKeywords.some(keyword => categoryLower.includes(keyword));
          
          if (isFeatured) {
            featuredCount++;
          }

          // Track category for logging
          const categoryName = product.category || 'Sin categoría';
          categoryCount.set(categoryName, (categoryCount.get(categoryName) || 0) + 1);
          
          // Track valid images
          if (product.image_url) {
            productsWithValidImages++;
          }

          const { error: insertError } = await supabase
            .from('products')
            .insert({
              sku: sku,
              name: product.name || product.part_number,
              title: product.name || product.part_number,
              description: product.description || product.description2 || null,
              price_base: priceBaseCents,
              price_cents: priceFinalCents,
              price_final: priceFinalCents,
              currency: 'eur',
              stock: product.stock,
              image_url: product.image_url || null,
              category: categoryName || null,
              category_id: categoryId,
              brand: product.brand || null,
              tags: null,
              active: true,
              featured: isFeatured
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
  console.log(`Categories - Created: ${summary.categoriesCreated}, Reused: ${summary.categoriesReused}`);
  console.log(`Featured products set: ${featuredCount}`);
  console.log(`Products with valid images: ${productsWithValidImages}`);
  console.log(`Manual images preserved: ${manualImagesPreserved}`);
  console.log(`Image URL detection: Found ${productsWithValidImages} products with valid image URLs out of ${summary.inserted + summary.updated} processed`);
  console.log(`Total products imported: ${products.length}`);
  
  // Log first 3 entries for verification
  if (products.length > 0) {
    console.log('\n=== Sample Products (First 3) ===');
    products.slice(0, 3).forEach((p: Product, i: number) => {
      console.log(`\nProduct ${i + 1}:`);
      console.log(`  Name: "${p.name || 'N/A'}"`);
      console.log(`  Brand: "${p.brand || 'N/A'}"`);
      console.log(`  SKU: "${p.part_number || 'N/A'}"`);
      console.log(`  Price Base: ${p.price} EUR`);
      console.log(`  Stock: ${p.stock}`);
      console.log(`  Image: "${p.image_url || 'N/A'}"`);
      console.log(`  Category: "${p.category || 'N/A'}"`);
    });
    console.log('\n=====================================\n');
  }
  
  // Log category distribution
  console.log('Category distribution:');
  const sortedCategories = Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1]);
  sortedCategories.forEach(([category, count]) => {
    console.log(`  ${category}: ${count} products`);
  });
  
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
        categoriesCreated: summary.categoriesCreated,
        categoriesReused: summary.categoriesReused,
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
