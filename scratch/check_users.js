const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUserTokens() {
    console.log('--- Checking All Users and Tokens ---');
    const { data: profiles, error } = await supabase.from('profiles').select('id, full_name, push_token');
    if (error) {
        console.error(error);
    } else {
        console.log(`Total profiles: ${profiles.length}`);
        profiles.forEach(p => {
            console.log(`User: ${p.full_name || 'No Name'} (${p.id}), Token: ${p.push_token ? (p.push_token.substring(0, 20) + '...') : 'NULL'}`);
        });
    }
}

checkUserTokens();
