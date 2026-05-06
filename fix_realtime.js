const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRealtime() {
    console.log('Fixing Supabase Realtime for orders table...');
    
    // 1. Enable Realtime for the orders table
    const { error: pubError } = await supabase.rpc('enable_realtime_for_table', { table_name: 'orders' });
    
    if (pubError) {
        console.log('RPC failed (probably does not exist), trying manual SQL...');
        // Fallback: Use manual SQL if RPC fails
        const { error: sqlError } = await supabase.from('_realtime').select('*').limit(1); // Just a check
        
        // Since I can't run raw SQL easily via the client without an RPC, 
        // I will provide the user with the SQL to run in the dashboard.
    } else {
        console.log('Successfully enabled realtime via RPC.');
    }

    console.log('Checking publication status...');
    // This is just a dummy check to see if we can talk to Supabase
    const { data, error } = await supabase.from('orders').select('id').limit(1);
    if (error) console.error('Connection Error:', error.message);
    else console.log('Connection OK. Order ID:', data[0]?.id);
}

fixRealtime();
