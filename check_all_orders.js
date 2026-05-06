const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllOrders() {
    const { data: orders } = await supabase.from('orders').select('*');
    const { data: items } = await supabase.from('order_items').select('*');
    
    orders.forEach(order => {
        const orderItems = items.filter(i => i.order_id === order.id);
        const itemSum = orderItems.reduce((acc, i) => acc + (i.quantity * i.price_at_time), 0);
        if (order.total_price !== itemSum) {
            console.log(`Mismatch found! Order ID: ${order.id}`);
            console.log(`  Order total_price: ${order.total_price}`);
            console.log(`  Sum of items: ${itemSum}`);
        } else {
            console.log(`Order ${order.id.substring(0, 8)} matches: ${order.total_price}`);
        }
    });
}

checkAllOrders();
