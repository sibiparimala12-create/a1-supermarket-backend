const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderIntegrity() {
    const orderId = '39cc574c-d96a-44b3-b80a-a2669ee6b85b';
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    
    console.log('Order Total:', order.total_price);
    let calculatedTotal = 0;
    items.forEach(item => {
        console.log(`Item: qty=${item.quantity}, price=${item.price_at_time}`);
        calculatedTotal += item.quantity * item.price_at_time;
    });
    console.log('Calculated Total from Items:', calculatedTotal);
}

checkOrderIntegrity();
