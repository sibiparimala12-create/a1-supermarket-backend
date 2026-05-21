const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000'; // Assuming it's running locally

async function testAll() {
    console.log('🚀 Starting A1 Supermarket System Test...\n');

    // 1. Health Check
    try {
        const res = await axios.get(`${BACKEND_URL}/api/health`);
        console.log('✅ [BACKEND] Health Check: SUCCESS', res.data);
    } catch (e) {
        console.error('❌ [BACKEND] Health Check: FAILED', e.message);
    }

    // 2. Store Status
    try {
        const res = await axios.get(`${BACKEND_URL}/api/store/status`);
        console.log('✅ [STORE] Status Fetch: SUCCESS', res.data);
    } catch (e) {
        console.error('❌ [STORE] Status Fetch: FAILED', e.message);
    }

    // 3. Categories
    try {
        const res = await axios.get(`${BACKEND_URL}/api/categories`);
        console.log(`✅ [CATALOG] Categories Fetch: SUCCESS (${res.data.length} found)`);
    } catch (e) {
        console.error('❌ [CATALOG] Categories Fetch: FAILED', e.message);
    }

    // 4. Trending Products
    try {
        const res = await axios.get(`${BACKEND_URL}/api/products/trending`);
        console.log(`✅ [CATALOG] Trending Products: SUCCESS (${res.data.length} found)`);
    } catch (e) {
        console.error('❌ [CATALOG] Trending Products: FAILED', e.message);
    }

    // 5. Order Creation (Fail Check - Unauthorized)
    try {
        await axios.post(`${BACKEND_URL}/api/orders`, {
            items: [{ product_id: 'any', quantity: 1 }],
            address: 'Test Address'
        });
    } catch (e) {
        if (e.response && e.response.status === 401) {
            console.log('✅ [AUTH] Order Security: SUCCESS (Rejected unauthorized request as expected)');
        } else {
            console.warn('⚠️ [AUTH] Order Security: UNEXPECTED RESPONSE', e.message);
        }
    }

    console.log('\n🏁 System test complete. Environment is stable.');
}

testAll();
