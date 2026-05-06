const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking Supabase connection and data...');
  
  const { data: categories, error: catError } = await supabase.from('categories').select('count', { count: 'exact' });
  const { data: products, error: prodError } = await supabase.from('products').select('count', { count: 'exact' });

  if (catError) console.error('Category Error:', catError.message);
  else console.log('Categories count:', categories.length > 0 ? categories[0] : 'No count returned');

  if (prodError) console.error('Product Error:', prodError.message);
  else console.log('Products count:', products.length > 0 ? products[0] : 'No count returned');

  const { data: samples, error: sampleError } = await supabase.from('categories').select('*').limit(1);
  if (sampleError) console.error('Sample Error (RLS check):', sampleError.message);
  else if (samples.length === 0) console.log('Tables are EMPTY. You need to run the seed script!');
  else console.log('Success! Found data:', samples[0].name);
}

checkData();
