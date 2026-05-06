const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    // This RPC call tries to get the check constraints for the admin_profiles table
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'admin_profiles' });
    
    if (error) {
        // If RPC fails, we'll try a raw query to the information_schema
        console.log('RPC failed, trying raw query...');
        const { data: rawData, error: rawError } = await supabase
            .from('_rpc_helper_') // Placeholder, usually we can't query information_schema directly via PostgREST
            .select('*')
            .limit(1);
        
        // Since we can't easily query information_schema via PostgREST without a custom function,
        // we will try to GUESS by attempting inserts with common roles.
        const rolesToTry = ['manager', 'secondary', 'operator', 'editor', 'admin'];
        for (const role of rolesToTry) {
            console.log(`Testing role: ${role}...`);
            const { error: testError } = await supabase
                .from('admin_profiles')
                .insert([{ email: `test_${role}@example.com`, password_hash: 'temp', role, status: 'pending' }]);
            
            if (!testError) {
                console.log(`✅ Success! Role '${role}' is allowed.`);
                // Clean up
                await supabase.from('admin_profiles').delete().eq('email', `test_${role}@example.com`);
                return;
            } else {
                console.log(`❌ Failed for '${role}':`, testError.message);
            }
        }
    } else {
        console.log('Constraint Data:', data);
    }
}

inspectSchema();
