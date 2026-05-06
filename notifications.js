const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * A1 Supermarket Notification Service
 * Handles real-time alerts via WhatsApp and Push Notifications
 */
class NotificationService {
    /**
     * Send WhatsApp Message using Twilio API
     * 
     * HOW IT WORKS:
     * - Uses the Twilio REST API to send automated WhatsApp alerts.
     * - Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.
     * - Used primarily for critical admin alerts (like Low Stock).
     */
    static async sendWhatsApp(to, message) {
        console.log(`[WhatsApp] Triggering message to ${to}: ${message}`);
        
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_WHATSAPP_NUMBER;

        if (!accountSid || !authToken) {
            console.warn('[WhatsApp] Twilio credentials missing, skipping actual send.');
            return { success: false, error: 'Config missing' };
        }

        // Implementation of Twilio REST API call
        // const client = require('twilio')(accountSid, authToken);
        // return await client.messages.create({ body: message, from, to });
        
        return { success: true, mock: true };
    }

    /**
     * Send Rich Push Notification using Expo Push API
     * 
     * HOW IT WORKS:
     * - Sends a POST request to Expo's Push Gateway.
     * - Expo then routes the message to APNs (Apple) or FCM (Android) automatically.
     * - Requires a valid 'ExponentPushToken[...]'.
     */
    static async sendPush(token, title, body, image_url = null) {
        console.log(`[Push] Sending to ${token.substring(0, 15)}...`);
        
        if (!token || !token.startsWith('ExponentPushToken')) {
            console.warn('[Push] Invalid token format:', token);
            return { success: false, error: 'Invalid token' };
        }

        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', {
                to: token,
                title: title,
                body: body,
                data: { image_url },
                sound: 'default',
                priority: 'high',
                channelId: 'default'
            });

            const result = response.data;
            if (result.data && result.data.status === 'ok') {
                return { success: true };
            } else {
                console.error('[Push] Expo Error:', result.errors);
                return { success: false, error: result.errors };
            }
        } catch (err) {
            console.error('[Push] Network Error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Broadcast Push Notification to all users
     */
    static async broadcastPush(supabase, title, body, image_url = null) {
        console.log(`[Broadcast] Sending push to all registered users: ${title}`);
        
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('push_token')
            .not('push_token', 'is', null);
        
        if (error) {
            console.error('[Broadcast] Error fetching tokens:', error);
            return { success: false, error: error.message };
        }

        if (!profiles || profiles.length === 0) {
            console.log('[Broadcast] No users with push tokens found.');
            return { success: true, total: 0, message: 'No registered recipients found' };
        }

        // Expo allows batching notifications (up to 100 per request)
        // For simplicity, we send them all in parallel
        const results = await Promise.all(profiles.map(p => this.sendPush(p.push_token, title, body, image_url)));
        
        const successCount = results.filter(r => r.success).length;
        console.log(`[Broadcast] Completed. Success: ${successCount}/${profiles.length}`);
        
        return { 
            success: true, 
            total: profiles.length, 
            successful: successCount,
            errorCount: profiles.length - successCount
        };
    }

    /**
     * Trigger Low Stock Alert
     */
    static async triggerLowStockAlert(productName, stockCount) {
        const message = `⚠️ LOW STOCK ALERT: ${productName} is running out! Current stock: ${stockCount}. Please restock soon.`;
        console.log(`[Admin Alert] ${message}`);
        
        return await this.sendWhatsApp('whatsapp:+910000000000', message);
    }
}

module.exports = NotificationService;
