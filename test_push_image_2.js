const axios = require('axios');

async function testPush() {
    try {
        const tokens = ['ExponentPushToken[RshfFSEWHh64viqZheC0CP]', 'ExponentPushToken[3Ny8iuBfZ9NJ9q6mz0ndFe]', 'ExponentPushToken[G0gs7hOi4u5oZQQKAd0dJ6]'];
        for (const token of tokens) {
            const res = await axios.post('https://exp.host/--/api/v2/push/send', {
                to: token,
                title: 'Image Test',
                body: 'Testing image attachment',
                image: 'https://vnyfgrqrgtjiwmniozki.supabase.co/storage/v1/object/public/a1-supermarket-storage/banners/grocery-banner.png',
                sound: 'default',
                priority: 'high'
            });
            console.log(`Response for ${token}:`, JSON.stringify(res.data, null, 2));
        }
    } catch(e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
testPush();
