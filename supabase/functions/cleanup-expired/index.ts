import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate secret for security
  const authHeader = req.headers.get('Authorization');
  const expectedKey = Deno.env.get('CLEANUP_SECRET');
  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    console.error('Unauthorized cleanup attempt');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting expired products cleanup...');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Find all products that are expired (expiry_date < today) and still active
    const { data: expiredProducts, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .lt('expiry_date', today);

    if (fetchError) {
      console.error('Error fetching expired products:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredProducts?.length || 0} expired products`);

    if (!expiredProducts || expiredProducts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired products found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each expired product
    const results = [];
    for (const product of expiredProducts) {
      // Update product status to expired
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Error updating product ${product.id}:`, updateError);
        results.push({ id: product.id, success: false, error: updateError.message });
        continue;
      }

      // Add history entry for the expired product
      const { error: historyError } = await supabase
        .from('history')
        .insert({
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode,
          action: 'expired',
          details: `Product expired on ${product.expiry_date}. Auto-archived by system.`,
          user_id: product.user_id,
        });

      if (historyError) {
        console.error(`Error adding history for product ${product.id}:`, historyError);
      }

      results.push({ id: product.id, name: product.name, success: true });
      console.log(`Marked product ${product.name} (${product.id}) as expired`);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Cleanup complete. Processed ${successCount}/${expiredProducts.length} products`);

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup completed', 
        processed: expiredProducts.length,
        success: successCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cleanup function error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});