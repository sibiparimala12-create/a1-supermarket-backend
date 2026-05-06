const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrderItems() {
    console.log('Fetching order items...');
    const { data, error } = await supabase.from('order_items').select('*').limit(1);
    if (error) {
        console.error('Error fetching order items:', error.message);
    } else {
        console.log('Order items found:', data.length);
        if (data.length > 0) {
            console.log('First order item:', data[0]);
        }
    }
}

testOrderItems();
