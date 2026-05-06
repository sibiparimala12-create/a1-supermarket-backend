require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectOrderItems() {
    const { data: row, error: rowError } = await supabase.from('order_items').select('*').limit(1);
    if (rowError) {
        console.error('Error:', rowError.message);
        return;
    }
    console.log('Columns in order_items:', Object.keys(row[0] || {}));
}

inspectOrderItems();
