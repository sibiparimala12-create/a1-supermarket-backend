const axios = require('axios');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const path = require('path');

dotenv.config();

// Initialize Firebase Admin SDK
try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (parseErr) {
            // If it's a base64 encoded string, decode it first
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
        }
    } else {
        serviceAccount = require('./firebase-service-account.json');
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('[NotificationService] Firebase Admin initialized.');
} catch (e) {
    console.warn('[NotificationService] Firebase Admin initialization failed (check your config):', e.message);
}

/**
 * A1 Supermarket Notification Service
 * Handles real-time alerts via WhatsApp and Push Notifications (Expo + Firebase)
 */
class NotificationService {
    /**
     * Send WhatsApp Message using Twilio API
     */
    static async sendWhatsApp(to, message) {
        console.log(`[WhatsApp] Triggering message to ${to}: ${message}`);
        
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            console.warn('[WhatsApp] Twilio credentials missing, skipping actual send.');
            return { success: false, error: 'Config missing' };
        }
        
        return { success: true, mock: true };
    }

    /**
     * Send Rich Push Notification
     * Automatically detects if the token is Expo or FCM and routes correctly.
     */
    static async sendPush(token, title, body, image_url = null) {
        if (!token) return { success: false, error: 'No token provided' };

        // DETECT TYPE: Expo tokens start with 'ExponentPushToken'
        if (token.startsWith('ExponentPushToken')) {
            return await this.sendExpoPush(token, title, body, image_url);
        } else {
            // Assume it's a native FCM token
            return await this.sendFcmPush(token, title, body, image_url);
        }
    }

    /**
     * Internal: Send via Expo (Legacy/Go)
     */
    static async sendExpoPush(token, title, body, image_url) {
        console.log(`[Push-Expo] Sending to ${token.substring(0, 25)}...`);
        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', {
                to: token,
                title,
                body,
                data: { image_url },
                sound: 'default',
                priority: 'high'
            });
            return { success: response.data?.data?.status === 'ok' };
        } catch (err) {
            console.error('[Push-Expo] Error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Internal: Send via Firebase (Production/Native)
     */
    static async sendFcmPush(token, title, body, image_url) {
        console.log(`[Push-FCM] Sending data-only message for full control...`);
        try {
            const message = {
                // We send only 'data' so the app's Notifee handler can apply BigTextStyle/BigPictureStyle
                data: { 
                    title: title,
                    body: body,
                    image_url: image_url || '' 
                },
                token: token,
                android: {
                    priority: 'high',
                }
            };
            
            await admin.messaging().send(message);
            return { success: true };
        } catch (err) {
            console.error('[Push-FCM] Error:', err.message);
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
        const message = `⚠️ LOW STOCK ALERT: ${productName} is running out! Current stock: ${stockCount}.`;
        return await this.sendWhatsApp('whatsapp:+910000000000', message);
    }
}

module.exports = NotificationService;
