require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSlogans() {
  const { data, error } = await supabase.from('marketing_slogans').select('*');
  console.log("Error:", error);
  console.log("Slogans:", JSON.stringify(data, null, 2));
}

checkSlogans();
