const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrderItems() {
    console.log('--- Checking Order Items Columns ---');
    const { data: items, error } = await supabase.from('order_items').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log('Order Items columns:', Object.keys(items[0] || {}));
        console.log('Sample item:', items[0]);
    }
}

checkOrderItems();
