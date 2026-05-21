require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTokens() {
  const { data, error } = await supabase.from('profiles').select('id, full_name, push_token');
  console.log("Error:", error);
  console.log("Profiles:");
  if (data) {
    data.forEach(p => console.log(`${p.full_name}: ${p.push_token}`));
  }
}

checkTokens();
