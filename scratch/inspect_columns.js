const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
    const { data, error } = await supabase.from('admin_profiles').select('*').limit(1);
    if (error) {
        console.error('Error fetching columns:', error);
        return;
    }
    if (data.length > 0) {
        console.log('Columns in admin_profiles:', Object.keys(data[0]));
    } else {
        console.log('No data in admin_profiles to inspect columns.');
    }
}

inspectColumns();
