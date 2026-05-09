require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRpc() {
    console.log('Checking if place_order_atomic exists...');
    // Try with one of the parameters to see if it catches it
    const { data, error } = await supabase.rpc('place_order_atomic', { p_user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (error) {
        console.log('RPC Error:', error.message);
        if (error.message.includes('function') && error.message.includes('does not exist')) {
            console.error('CRITICAL: place_order_atomic function does NOT exist in the database!');
        } else {
            console.log('RPC exists but failed as expected with empty params.');
        }
    } else {
        console.log('RPC call succeeded (unexpectedly)!');
    }
}

checkRpc();
