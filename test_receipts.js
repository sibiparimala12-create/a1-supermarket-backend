const axios = require('axios');

async function getReceipts() {
    try {
        const ids = [
            "019e1ae4-94ba-722c-825e-2edc656c4d47",
            "019e1ae4-9687-70fa-b8e0-1407493f8ed3",
            "019e1ae4-9867-717e-b131-c5987e5cb08d"
        ];
        const res = await axios.post('https://exp.host/--/api/v2/push/get-receipts', { ids });
        console.log("Receipts:", JSON.stringify(res.data, null, 2));
    } catch(e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
getReceipts();
