const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSecurityScan() {
    console.log('🚀 INITIALIZING SECURITY SCAN — RED HAT MODE\n');
    
    if (!supabaseUrl || !anonKey || !serviceKey) {
        console.error('❌ Error: Missing credentials in .env file.');
        return;
    }

    const publicClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceKey);

    const tablesToTest = ['admin_profiles', 'orders', 'order_items', 'products', 'categories'];
    
    console.log('--------------------------------------------------');
    console.log('TEST 1: UNRESTRICTED PUBLIC ACCESS (Hacker Simulation)');
    console.log('--------------------------------------------------');

    for (const table of tablesToTest) {
        try {
            const { data, error } = await publicClient.from(table).select('*').limit(1);
            if (error) {
                console.log(`[PASS] 🔒 ${table.padEnd(15)}: Access BLOCKED (${error.message})`);
            } else if (data && data.length > 0) {
                if (['products', 'categories'].includes(table)) {
                    console.log(`[INFO] 🔓 ${table.padEnd(15)}: Access OPEN (Correct for public data)`);
                } else {
                    console.log(`[FAIL] 🚨 ${table.padEnd(15)}: Access EXPOSED! Hacker can see your data.`);
                }
            } else {
                console.log(`[WARN] ❓ ${table.padEnd(15)}: No data found to test (or RLS blocking silently).`);
            }
        } catch (e) {
            console.log(`[PASS] 🔒 ${table.padEnd(15)}: Access BLOCKED (Exception: ${e.message})`);
        }
    }

    console.log('\n--------------------------------------------------');
    console.log('TEST 2: ORDER INJECTION (Fake Order Attempt)');
    console.log('--------------------------------------------------');
    
    try {
        const { error: insertError } = await publicClient.from('orders').insert([
            { user_id: 'd748680c-03d3-4882-9653-5d752c530188', total_price: 0.01, status: 'pending' }
        ]);

        if (insertError) {
            console.log(`[PASS] 🔒 Order Injection: BLOCKED (${insertError.message})`);
        } else {
            console.log(`[FAIL] 🚨 Order Injection: SUCCESS! Hacker can create fake orders.`);
        }
    } catch (e) {
        console.log(`[PASS] 🔒 Order Injection: BLOCKED (Exception: ${e.message})`);
    }

    console.log('\n--------------------------------------------------');
    console.log('TEST 3: BACKEND SERVICE ACCESS (Valid System)');
    console.log('--------------------------------------------------');
    
    try {
        const { data: adminData, error: adminError } = await adminClient.from('admin_profiles').select('*').limit(1);
        if (adminError) {
            console.log(`[FAIL] ❌ Backend Access: BLOCKED! (${adminError.message})`);
        } else {
            console.log(`[PASS] ✅ Backend Access: SUCCESS. Master key is working correctly.`);
        }
    } catch (e) {
        console.log(`[FAIL] ❌ Backend Access: BLOCKED! (Exception: ${e.message})`);
    }

    console.log('\n--------------------------------------------------');
    console.log('SCAN COMPLETE');
}

runSecurityScan();
