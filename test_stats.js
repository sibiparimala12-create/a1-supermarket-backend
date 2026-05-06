const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStats() {
    try {
        const [ordersRes, productsRes, lowStockRes, catsRes] = await Promise.all([
            supabase.from('orders').select('total_price, status'),
            supabase.from('products').select('id', { count: 'exact', head: true }),
            supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock_quantity', 10),
            supabase.from('categories').select('id, name')
        ]);

        if (ordersRes.error) console.error('Orders Error:', ordersRes.error.message);
        if (productsRes.error) console.error('Products Error:', productsRes.error.message);
        
        const revenue = ordersRes.data?.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0) || 0;
        const pending = ordersRes.data?.filter(o => o.status === 'pending').length || 0;

        console.log({
            revenue,
            pendingOrders: pending,
            totalProducts: productsRes.count || 0,
            lowStockItems: lowStockRes.count || 0,
            categoriesCount: catsRes.data?.length || 0
        });
    } catch (err) {
        console.error('Catch Error:', err.message);
    }
}

testStats();
