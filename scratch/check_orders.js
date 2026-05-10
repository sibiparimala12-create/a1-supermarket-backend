const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTriggers() {
    console.log('--- Checking Triggers on order_items ---');
    const { data: triggers, error } = await supabase.rpc('get_triggers_info');
    
    // If the RPC doesn't exist, we'll try a raw query via a temporary function
    if (error) {
        console.log('RPC failed, trying raw query...');
        const { data: rawTriggers, error: rawError } = await supabase.from('pg_trigger').select('tgname').limit(1);
        // Supabase doesn't allow direct access to pg_trigger via API usually.
        // I'll try to check the schema using the orders table again.
    } else {
        console.log(triggers);
    }
}

async function checkMoreOrders() {
    console.log('\n--- Checking Recent Orders ---');
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error(error);
    } else {
        orders.forEach(o => {
            console.log(`Order ID: ${o.id}, Total: ${o.total_amount}, Status: ${o.status}, Created: ${o.created_at}`);
        });
    }
}

checkMoreOrders();
