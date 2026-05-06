const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SHOULD_FIX = process.argv.includes('--fix');

/**
 * Returns the expected order total from line items.
 */
function calculateOrderTotal(orderItems) {
    return orderItems.reduce((acc, item) => acc + Number(item.quantity) * Number(item.price_at_time), 0);
}

/**
 * Builds a quick lookup map of order_id -> order_items[].
 */
function groupItemsByOrder(items) {
    const map = new Map();
    for (const item of items) {
        if (!map.has(item.order_id)) map.set(item.order_id, []);
        map.get(item.order_id).push(item);
    }
    return map;
}

/**
 * Audits all orders and optionally repairs mismatched totals.
 */
async function checkDataIntegrity() {
    console.log('--- STARTING DATA INTEGRITY AUDIT ---');
    console.log(`Mode: ${SHOULD_FIX ? 'AUDIT + FIX' : 'AUDIT ONLY'}`);

    const { data: orders, error: ordersError } = await supabase.from('orders').select('id,total_price');
    const { data: items, error: itemsError } = await supabase.from('order_items').select('order_id,quantity,price_at_time');

    if (ordersError || itemsError) {
        console.error('Error fetching data:', ordersError || itemsError);
        process.exitCode = 1;
        return;
    }

    console.log(`Analyzing ${orders.length} orders and ${items.length} order items...`);
    const itemsByOrder = groupItemsByOrder(items);

    let mismatchCount = 0;
    let fixedCount = 0;

    for (const order of orders) {
        const orderItems = itemsByOrder.get(order.id) || [];
        const calculatedTotal = calculateOrderTotal(orderItems);
        const storedTotal = Number(order.total_price || 0);

        if (storedTotal !== calculatedTotal) {
            mismatchCount++;
            console.warn(
                `[MISMATCH] Order ${order.id.substring(0, 8)}: DB Total=${storedTotal}, Calculated=${calculatedTotal}`
            );

            if (SHOULD_FIX) {
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ total_price: calculatedTotal })
                    .eq('id', order.id);

                if (updateError) {
                    console.error(`[FIX FAILED] ${order.id.substring(0, 8)}: ${updateError.message}`);
                    process.exitCode = 1;
                } else {
                    fixedCount++;
                }
            }
        }
    }

    if (mismatchCount === 0) {
        console.log('✅ Success: All order totals are consistent with line items.');
        return;
    }

    if (SHOULD_FIX) {
        console.log(`⚠️ Found ${mismatchCount} mismatches and repaired ${fixedCount}.`);
        if (fixedCount !== mismatchCount) {
            console.log('❌ Some mismatches could not be repaired.');
            process.exitCode = 1;
        } else {
            console.log('✅ All mismatches repaired.');
        }
        return;
    }

    console.log(`❌ Audit Failed: Found ${mismatchCount} inconsistent orders.`);
    console.log('Run `node tests/data_integrity.js --fix` to repair them.');
    process.exitCode = 1;
}

checkDataIntegrity().catch((err) => {
    console.error('Unexpected audit failure:', err.message);
    process.exitCode = 1;
});
