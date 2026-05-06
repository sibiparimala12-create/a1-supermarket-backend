require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectOrders() {
    const { data, error } = await supabase.rpc('get_column_names', { table_name: 'orders' });
    if (error) {
        // Fallback if RPC doesn't exist: try to select one row
        const { data: row, error: rowError } = await supabase.from('orders').select('*').limit(1);
        if (rowError) {
            console.error('Error:', rowError.message);
            return;
        }
        console.log('Columns in orders:', Object.keys(row[0] || {}));
    } else {
        console.log('Columns in orders:', data);
    }
}

inspectOrders();
