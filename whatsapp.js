const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
const toNumber = 'whatsapp:+919841784440'; // Your Master Admin Number

const client = twilio(accountSid, authToken);

async function sendInventoryAlert(productName, currentStock) {
    try {
        console.log(`[WhatsApp] Sending alert for ${productName} (Stock: ${currentStock})...`);
        
        const message = await client.messages.create({
            body: `🚨 *A1 Supermarket Stock Alert*\n\nYour item *${productName}* is running low!\n📉 *Current Stock:* ${currentStock}\n\nTime to restock your shelves! 📦`,
            from: fromNumber,
            to: toNumber
        });

        console.log(`[WhatsApp] Alert sent! SID: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (err) {
        console.error('[WhatsApp Error]', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendInventoryAlert };
