const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    console.log('--- STARTING DATA RECONCILIATION ---');
    
    // 1. Fetch all orders and items
    const { data: orders, error: ordersError } = await supabase.from('orders').select('*');
    const { data: items, error: itemsError } = await supabase.from('order_items').select('*');

    if (ordersError || itemsError) {
        console.error('Error fetching data:', ordersError || itemsError);
        return;
    }

    console.log(`Analyzing ${orders.length} orders...`);

    for (const order of orders) {
        const orderItems = items.filter(i => i.order_id === order.id);
        const calculatedTotal = orderItems.reduce((acc, i) => acc + (i.quantity * i.price_at_time), 0);

        if (Number(order.total_price) !== calculatedTotal) {
            console.log(`Fixing Order ${order.id.substring(0, 8)}: ${order.total_price} -> ${calculatedTotal}`);
            
            const { error: updateError } = await supabase
                .from('orders')
                .update({ total_price: calculatedTotal })
                .eq('id', order.id);

            if (updateError) {
                console.error(`Failed to update order ${order.id}:`, updateError.message);
            }
        }
    }

    console.log('--- DATA RECONCILIATION COMPLETE ---');
}

fixData();
