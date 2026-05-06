const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data, error } = await supabase.from('admin_profiles').select('role').limit(10);
    if (error) {
        console.error('Error fetching roles:', error);
        return;
    }
    const roles = [...new Set(data.map(r => r.role))];
    console.log('Unique roles in admin_profiles:', roles);
}

checkRoles();
