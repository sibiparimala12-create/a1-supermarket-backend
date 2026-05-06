require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrderConstraints() {
    // Attempt to update an order with an invalid status to see the error message (diagnostic)
    // First, get a real order ID
    const { data: order } = await supabase.from('orders').select('id').limit(1).single();
    if (!order) {
        console.log('No orders found to test constraints.');
        return;
    }

    const { error } = await supabase.from('orders').update({ status: 'invalid_status_test' }).eq('id', order.id);
    if (error && error.message.includes('check constraint')) {
        console.log('Constraint Error:', error.message);
    } else {
        console.log('No strict check constraint found for order status, or update succeeded.');
    }
}

checkOrderConstraints();
