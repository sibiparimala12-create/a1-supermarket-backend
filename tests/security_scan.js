const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSecurityScan() {
    console.log('🚀 A1 SUPERMARKET — SECURITY AUDIT SCRIPT\n');
    
    if (!supabaseUrl || !anonKey || !serviceKey) {
        console.error('❌ Error: Missing credentials in .env file.');
        process.exitCode = 1;
        return;
    }

    const publicClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceKey);

    const tablesToTest = ['admin_profiles', 'orders', 'order_items', 'products', 'categories'];
    
    console.log('TEST 1: UNRESTRICTED PUBLIC ACCESS (Anonymous User Simulation)');
    console.log('--------------------------------------------------');

    let failureCount = 0;
    for (const table of tablesToTest) {
        const { data, error } = await publicClient.from(table).select('*').limit(1);
        if (error) {
            console.log(`[PASS] 🔒 ${table.padEnd(15)}: Access BLOCKED (${error.message})`);
        } else if (data && data.length > 0) {
            if (['products', 'categories'].includes(table)) {
                console.log(`[INFO] 🔓 ${table.padEnd(15)}: Access OPEN (Publicly visible data)`);
            } else {
                console.log(`[FAIL] 🚨 ${table.padEnd(15)}: Access EXPOSED! Sensitive data leak detected.`);
                failureCount++;
            }
        }
    }

    console.log('\nTEST 2: ORDER INJECTION (Unauthorized Insertion)');
    console.log('--------------------------------------------------');
    
    const { error: insertError } = await publicClient.from('orders').insert([
        { user_id: 'd748680c-03d3-4882-9653-5d752c530188', total_price: 0.01, status: 'pending' }
    ]);

    if (insertError) {
        console.log(`[PASS] 🔒 Order Injection: BLOCKED (${insertError.message})`);
    } else {
        console.log(`[FAIL] 🚨 Order Injection: SUCCESS! Hacker can inject orders.`);
        failureCount++;
    }

    console.log('\nTEST 3: MASTER KEY VERIFICATION');
    console.log('--------------------------------------------------');
    
    const { error: adminError } = await adminClient.from('admin_profiles').select('*').limit(1);
    if (adminError) {
        console.log(`[FAIL] ❌ Backend Access: BLOCKED! (${adminError.message})`);
        failureCount++;
    } else {
        console.log(`[PASS] ✅ Backend Access: SUCCESS. Service role key is authorized.`);
    }

    console.log('\nSCAN COMPLETE');
    if (failureCount > 0) {
        console.log(`❌ Security audit failed with ${failureCount} issue(s).`);
        process.exitCode = 1;
    } else {
        console.log('✅ Security audit passed.');
    }
}

runSecurityScan().catch((err) => {
    console.error('Unexpected security scan failure:', err.message);
    process.exitCode = 1;
});
