const axios = require('axios');

async function testPush() {
    try {
        const res = await axios.post('https://exp.host/--/api/v2/push/send', {
            to: 'ExponentPushToken[vTjUKlJOaA6Hbu0jgSU9CW]',
            title: 'Test',
            body: 'Test body',
            sound: 'default',
            priority: 'high'
        });
        console.log("Response:", JSON.stringify(res.data, null, 2));
    } catch(e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
testPush();
