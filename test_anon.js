const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Using ANON Key');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnon() {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) console.error('Error:', error.message);
    else console.log('Orders found with ANON:', data.length);
}

testAnon();
