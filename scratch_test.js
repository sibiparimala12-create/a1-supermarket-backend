const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  console.log('URL:', supabaseUrl);
  console.log('KEY:', supabaseKey ? 'PRESENT' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestOrder() {
  console.log('Inserting test order to trigger notification...');
  
  const testOrder = {
    total_price: 299.00,
    delivery_address: '📍 [TEST ORDER] 123 AI Street, Tech City',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('orders').insert([testOrder]).select();

  if (error) {
    console.error('Error inserting order:', error.message);
  } else {
    console.log('✅ Test order inserted successfully:', data[0].id);
    console.log('Admin Dashboard should now be buzzing!');
  }
}

insertTestOrder();
