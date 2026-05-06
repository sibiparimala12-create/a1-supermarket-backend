const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectStatusConstraints() {
    const statusesToTry = ['pending', 'approved', 'rejected', 'revoked', 'disabled'];
    for (const status of statusesToTry) {
        console.log(`Testing status: ${status}...`);
        const { error: testError } = await supabase
            .from('admin_profiles')
            .update({ status })
            .eq('email', 'test_revoke@example.com') // We don't need a real email to test constraint violation usually, but better to have one
            .select();
        
        // If it's a constraint violation, it will say so even if the row doesn't exist?
        // Actually, if the row doesn't exist, it might not trigger the constraint check on the new values?
        // Let's create a temporary row.
        const { error: insertError } = await supabase
            .from('admin_profiles')
            .insert([{ email: 'test_revoke@example.com', password_hash: 'temp', role: 'secondary', status: 'pending' }]);
        
        const { error: updateError } = await supabase
            .from('admin_profiles')
            .update({ status })
            .eq('email', 'test_revoke@example.com');
        
        if (!updateError) {
            console.log(`✅ Success! Status '${status}' is allowed.`);
        } else {
            console.log(`❌ Failed for status '${status}':`, updateError.message);
        }
        
        // Cleanup
        await supabase.from('admin_profiles').delete().eq('email', 'test_revoke@example.com');
    }
}

inspectStatusConstraints();
