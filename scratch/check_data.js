const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    console.log('--- Checking Orders Table ---');
    const { data: orders, error: orderError } = await supabase.from('orders').select('*').limit(1);
    if (orderError) {
        console.error('Order Error:', orderError);
    } else {
        console.log('Order columns:', Object.keys(orders[0] || {}));
        console.log('Sample order:', orders[0]);
    }

    console.log('\n--- Checking Profiles Table (Push Tokens) ---');
    const { data: profiles, error: profError } = await supabase.from('profiles').select('push_token').not('push_token', 'is', null).limit(5);
    if (profError) {
        console.error('Profile Error:', profError);
    } else {
        console.log('Sample push tokens:', profiles.map(p => p.push_token));
    }
}

checkData();
