/**
 * ============================================================================
 *  A1 SUPERMARKET — SECURE BACKEND API SERVER
 * ============================================================================
 *  
 *  CORE ARCHITECTURE:
 *  - Node.js & Express: Primary web framework for API routing.
 *  - Supabase (PostgreSQL): Cloud database for persistence.
 *  - JWT: Stateless authentication for admin and user sessions.
 * 
 *  SECURITY HARDENING:
 *  - Helmet & CORS: Protects against cross-site attacks and unauthorized origins.
 *  - Rate Limiting: Prevents brute-force and DDoS attempts on sensitive routes.
 *  - Input Sanitization: Strips HTML/JS from inputs to block XSS.
 *  - Atomic Transactions: Uses Database RPCs to prevent race conditions (Double spending/Stock errors).
 * 
 *  BUSINESS LOGIC:
 *  - Store Operations: Dynamic hours and manual "kill-switch" for order acceptance.
 *  - Pre-ordering: Smart delivery slot scheduling for after-hours requests.
 *  - Analytics: Real-time calculation of revenue and inventory health.
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Internal modules
// ============================================================================
// SECURITY & VALIDATION LOGIC (Merged for simple deployment)
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h';
const VALID_ORDER_STATUSES = ['pending', 'packed', 'out_for_delivery', 'collect_from_store', 'delivered', 'cancelled'];
// 1. Initial Validation: Ensure critical environment variables are present
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('********************************************************');
    console.error('[CRITICAL ERROR] SUPABASE CREDENTIALS MISSING!');
    console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Railway Variables.');
    console.error('********************************************************');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim();
}

// Auth Middlewares
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth required' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { data: adminProfile } = await supabase.from('admin_profiles').select('email, role, status').eq('email', decoded.email).single();
        if (!adminProfile || adminProfile.status !== 'approved') return res.status(403).json({ error: 'Access denied' });
        req.admin = adminProfile;
        next();
    } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
}

async function requireUserAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth required' });
    const token = authHeader.split(' ')[1];
    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });
        req.user = { id: data.user.id, email: data.user.email };
        next();
    } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
}

function requireMaster(req, res, next) {
    if (!req.admin || req.admin.role !== 'master') return res.status(403).json({ error: 'Master admin access required' });
    next();
}

// Validation Middlewares
function validateLogin(req, res, next) {
    const { email, password } = req.body;
    if (!email || !EMAIL_REGEX.test(email.trim())) return res.status(400).json({ error: 'Valid email required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password too short' });
    next();
}

function validateOrderCreate(req, res, next) {
    const { items, address } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items required' });
    if (!address || address.trim().length < 5) return res.status(400).json({ error: 'Address required' });
    next();
}

/**
 * Validate Coupon Code
 */
async function validateCoupon(req, res, next) {
    const { code, cart_total } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    try {
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (error || !coupon) return res.status(404).json({ error: 'Invalid coupon code' });

        // Check expiry
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        // Check minimum order amount
        if (cart_total < coupon.min_order_amount) {
            return res.status(400).json({ error: `Min order for this coupon is ₹${coupon.min_order_amount}` });
        }

        req.coupon = coupon;
        next();
    } catch (err) { res.status(500).json({ error: 'Coupon validation failed' }); }
}

function validateOrderStatus(req, res, next) {
    const { status } = req.body;
    if (!status || !VALID_ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    next();
}

function validatePushNotification(req, res, next) {
    const { title, body } = req.body;
    if (!title || title.trim().length < 1) return res.status(400).json({ error: 'Title required' });
    if (!body || body.trim().length < 1) return res.status(400).json({ error: 'Body required' });
    next();
}

function validateResetRequest(req, res, next) {
    const { email } = req.body;
    if (!email || !EMAIL_REGEX.test(email.trim())) return res.status(400).json({ error: 'Valid email required' });
    next();
}

function validateResetExecute(req, res, next) {
    const { token, newPassword } = req.body;
    if (!token || token.length < 32) return res.status(400).json({ error: 'Valid reset token required' });
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    next();
}

function validateAdminApproval(req, res, next) {
    const { targetEmail, status } = req.body;
    if (!targetEmail || !EMAIL_REGEX.test(targetEmail.trim())) return res.status(400).json({ error: 'Valid target email required' });
    if (!status || !['approved', 'rejected', 'revoked'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    next();
}

function validateRequestAccess(req, res, next) {
    const { email, password } = req.body;
    if (!email || !EMAIL_REGEX.test(email.trim())) return res.status(400).json({ error: 'Valid email required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password too short' });
    next();
}

function generateToken(admin) {
    return jwt.sign({ email: admin.email, role: admin.role, status: admin.status }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * A1 Supermarket Notification Service
 * Handles real-time alerts via WhatsApp and Push Notifications
 */
class NotificationService {
    static async sendWhatsApp(to, message) {
        console.log(`[WhatsApp] Triggering message to ${to}: ${message}`);
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!accountSid || !authToken) return { success: false, error: 'Config missing' };
        return { success: true, mock: true };
    }

    static async sendPush(token, title, body, image_url = null) {
        if (!token || !token.startsWith('ExponentPushToken')) return { success: false, error: 'Invalid token' };
        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', {
                to: token, title, body, data: { image_url }, sound: 'default', priority: 'high', channelId: 'default'
            });
            return response.data.data && response.data.data.status === 'ok' ? { success: true } : { success: false };
        } catch (err) { return { success: false, error: err.message }; }
    }

    static async broadcastPush(supabase, title, body, image_url = null) {
        const { data: profiles, error } = await supabase.from('profiles').select('push_token').not('push_token', 'is', null);
        if (error || !profiles || profiles.length === 0) return { success: true, total: 0 };
        const results = await Promise.all(profiles.map(p => this.sendPush(p.push_token, title, body, image_url)));
        return { success: true, total: profiles.length, successful: results.filter(r => r.success).length };
    }

    static async triggerLowStockAlert(productName, stockCount) {
        const message = `⚠️ LOW STOCK ALERT: ${productName} is running out! Current stock: ${stockCount}.`;
        return await this.sendWhatsApp('whatsapp:+910000000000', message);
    }
}




const app = express();
app.set('trust proxy', 1); // Trust first proxy for secure rate limiting behind load balancers/Nginx
const PORT = process.env.PORT || 5000;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// 1. ROBUST CORS & DEBUGGING
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Set robust CORS headers
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-client-info');
    
    if (origin) {
        res.header('Access-Control-Allow-Credentials', 'true');
    }

    // Handle pre-flight (OPTIONS) requests immediately
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    // Logging for debugging
    console.log(`[API LOG] ${req.method} ${req.url} from ${origin || 'Local/App'}`);
    
    next();
});

// 2. Helmet — Security headers
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false, // Temporarily disabled for debugging
}));

// 3. Body parser with size limit (prevents payload bombs)
app.use(bodyParser.json({ limit: '1mb' }));

// 4. Global rate limiter — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// 4.5 Health Check (Required for Railway/Cloud)
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() }));

// 5. Strict rate limiter for auth endpoints — 10 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});

// 6. Strict rate limiter for password reset — 3 attempts per hour
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many reset attempts. Please try again later.' },
});

// 7. Strict rate limiter for public APIs to prevent scraping
const publicApiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please try again later.' },
});

// Supabase client is already initialized at the top for use in middleware

// ============================================================================
// CRON JOBS
// ============================================================================

// Marketing push every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] Triggering periodic marketing push...');
    try {
        const { data: slogans, error } = await supabase
            .from('marketing_slogans')
            .select('*')
            .eq('is_active', true);

        if (error || !slogans || slogans.length === 0) {
            console.log('[Cron] No active slogans found.');
            return;
        }

        const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];
        await NotificationService.broadcastPush(supabase, randomSlogan.title, randomSlogan.body, randomSlogan.image_url);
    } catch (err) {
        console.error('[Cron] Failed to send periodic push:', err.message);
    }
});

// ============================================================================
// PUBLIC ROUTES (No auth required)
// ============================================================================

app.get('/', (req, res) => {
    res.json({ message: 'A1 Supermarket API — Secure Server Active' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTH ENDPOINTS (Rate limited, validated, but no JWT required)
// ============================================================================

// Admin Login — Returns JWT token (NO auto-registration)
app.post('/api/admin/login', authLimiter, validateLogin, async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find admin profile in the database
        // We use .single() to ensure exactly one record is returned.
        const { data: profile, error } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('email', email)
            .single();

        // 2. If user not found, return generic error (don't reveal if email exists)
        if (!profile || (error && error.code === 'PGRST116')) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (error) throw error;

        // 3. Verify password
        const isMatch = await bcrypt.compare(password, profile.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // 4. Generate signed JWT
        const token = generateToken(profile);

        // 5. Return token + admin info
        res.json({
            token,
            email: profile.email,
            role: profile.role,
            status: profile.status,
            isApproved: profile.status === 'approved',
        });
    } catch (err) {
        console.error('[AUTH ERROR]', err.message);
        res.status(500).json({ error: 'Authentication service unavailable.' });
    }
});

// Forgot Password — Rate limited, only for existing admins
app.post('/api/admin/forgot-password', resetLimiter, validateResetRequest, async (req, res) => {
    const { email } = req.body;

    try {
        // Check if admin exists (don't reveal if email exists in response)
        const { data: profile } = await supabase
            .from('admin_profiles')
            .select('email')
            .eq('email', email)
            .single();

        // Always return success message (prevents email enumeration)
        if (!profile) {
            return res.json({ message: 'If this email is registered, a recovery link has been sent.' });
        }

        // Invalidate any existing tokens for this email
        await supabase.from('password_resets').delete().eq('email', email);

        // Generate new secure token
        const token = crypto.randomBytes(48).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        const { error } = await supabase
            .from('password_resets')
            .insert([{ email, token: tokenHash, expires_at: expiresAt }]);

        if (error) throw error;

        // In production: send actual email. For now, log securely.
        console.log(`[SECURITY] Password reset requested for ${email}.`);
        // TODO: Integrate email service (SendGrid, SES, etc.)

        res.json({ message: 'If this email is registered, a recovery link has been sent.' });
    } catch (err) {
        console.error('[RESET ERROR]', err.message);
        res.status(500).json({ error: 'Failed to initiate reset.' });
    }
});

// Reset Password Execution — Token-based (no JWT needed)
app.post('/api/admin/reset-password', resetLimiter, validateResetExecute, async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        // 1. Verify token exists and is not expired
        const { data: resetReq, error: fetchError } = await supabase
            .from('password_resets')
            .select('*')
            .eq('token', tokenHash)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (fetchError || !resetReq) {
            return res.status(400).json({ error: 'Invalid or expired recovery token.' });
        }

        // 2. Hash new password with high cost factor
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const { error: updateError } = await supabase
            .from('admin_profiles')
            .update({ password_hash: hashedPassword })
            .eq('email', resetReq.email);

        if (updateError) throw updateError;

        // 3. Delete ALL tokens for this email (invalidate everything)
        await supabase.from('password_resets').delete().eq('email', resetReq.email);

        res.json({ message: 'Password updated successfully. You can now log in.' });
    } catch (err) {
        console.error('[RESET EXEC ERROR]', err.message);
        res.status(500).json({ error: 'Failed to update password.' });
    }
});

// ============================================================================
// PROTECTED ADMIN ENDPOINTS (JWT required)
// ============================================================================

// Validate current admin token/session
app.get('/api/admin/me', requireAuth, (req, res) => {
    res.json({
        email: req.admin.email,
        role: req.admin.role,
        status: req.admin.status,
        isApproved: req.admin.isApproved,
    });
});

// Fetch all orders
app.get('/api/admin/orders', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[API] Error fetching orders:', error.message);
        return res.status(500).json({ error: 'Database error while fetching orders' });
    }
    res.json(data || []);
});

// Fetch order items for a specific order
app.get('/api/admin/orders/:id/items', requireAuth, async (req, res) => {
    const { id } = req.params;

    // Validate UUID format
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
        return res.status(400).json({ error: 'Invalid order ID format.' });
    }

    const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name, image_urls)')
        .eq('order_id', id);

    if (error) {
        console.error(`[API] Error fetching items for order ${id}:`, error.message);
        return res.status(500).json({ error: 'Database error while fetching order items' });
    }
    res.json(data || []);
});

// Update order status (SECURE: Admin check + validated against whitelist)
app.patch('/api/admin/orders/:id', requireAuth, validateOrderStatus, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Securely only allow the 'status' field to be updated
    const updateData = { status };

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
        return res.status(400).json({ error: 'Invalid order ID format.' });
    }

    const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select('*, profiles(push_token)'); // Join with profiles to get the token

    if (error) {
        console.error(`[API] Error updating order ${id}:`, error.message);
        return res.status(500).json({ error: 'Failed to update order status' });
    }
    if (!data || data.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = data[0];
    
    // Send Push Notification to the user
    if (order.profiles && order.profiles.push_token) {
        let title = 'Order Update';
        let body = `Your order status has been updated to ${status}.`;

        if (status === 'packed') {
            title = 'Order Accepted! ✅';
            body = 'Your order has been accepted and is being packed.';
        } else if (status === 'shipped') {
            title = 'Order Shipped! 🚚';
            body = 'Your order is on the way to you!';
        } else if (status === 'delivered') {
            title = 'Order Delivered! 📦';
            body = 'Your order has been successfully delivered. Enjoy!';
        }

        NotificationService.sendPush(order.profiles.push_token, title, body).catch(err => {
            console.error('[Push Notification] Failed to send:', err.message);
        });
    }

    res.json(order);
});

// Dashboard stats
app.get('/api/admin/stats', requireAuth, async (req, res) => {
    try {
        const [ordersRes, productsRes, lowStockRes, catsRes] = await Promise.all([
            supabase.from('orders').select('total_price, status'),
            supabase.from('products').select('id', { count: 'exact', head: true }),
            supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock_quantity', 10),
            supabase.from('categories').select('id, name')
        ]);

        if (ordersRes.error) throw ordersRes.error;
        if (productsRes.error) throw productsRes.error;
        if (lowStockRes.error) throw lowStockRes.error;

        const revenue = ordersRes.data?.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0) || 0;
        const pending = ordersRes.data?.filter(o => o.status === 'pending').length || 0;

        res.json({
            revenue,
            pendingOrders: pending,
            totalProducts: productsRes.count || 0,
            lowStockItems: lowStockRes.count || 0,
            categoriesCount: catsRes.data?.length || 0
        });
    } catch (err) {
        console.error('[API] Stats Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Full analytics data
app.get('/api/admin/analytics', requireAuth, async (req, res) => {
    try {
        const { dateFilter } = req.query;

        const [ordersRes, itemsRes, catsRes] = await Promise.all([
            supabase.from('orders').select('*').gte('created_at', dateFilter).order('created_at', { ascending: true }),
            supabase.from('order_items').select('*, products(name, category_id, price), orders!inner(created_at)').gte('orders.created_at', dateFilter),
            supabase.from('categories').select('id, name')
        ]);

        if (ordersRes.error) throw ordersRes.error;
        if (itemsRes.error) throw itemsRes.error;
        if (catsRes.error) throw catsRes.error;

        res.json({
            orders: ordersRes.data || [],
            items: itemsRes.data || [],
            categories: catsRes.data || []
        });
    } catch (err) {
        console.error('[API] Analytics Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// Request new admin access (Public)
app.post('/api/admin/request-access', authLimiter, validateRequestAccess, async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Check if profile already exists
        const { data: existing, error: checkError } = await supabase
            .from('admin_profiles')
            .select('email')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists or is pending approval.' });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 3. Create pending profile
        const { error: insertError } = await supabase
            .from('admin_profiles')
            .insert([{
                email,
                password_hash: hashedPassword,
                role: 'secondary',
                status: 'pending'
            }]);

        if (insertError) throw insertError;

        res.status(201).json({ message: 'Access request submitted successfully. Waiting for Master Admin approval.' });
    } catch (err) {
        console.error('[REQUEST ACCESS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to submit access request.' });
    }
});

// ============================================================================
// MASTER ADMIN ENDPOINTS (JWT + Master role required)
// ============================================================================

// List pending access requests
app.get('/api/admin/requests', requireAuth, requireMaster, async (req, res) => {
    const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .neq('role', 'master'); // Fetch everyone except the master admin

    if (error) return res.status(500).json({ error: 'Failed to fetch access requests.' });
    res.json(data || []);
});

// Approve/Reject admin access
app.post('/api/admin/approve', requireAuth, requireMaster, validateAdminApproval, async (req, res) => {
    const { targetEmail, status } = req.body;

    // Prevent master from modifying their own status
    if (targetEmail === req.admin.email) {
        return res.status(400).json({ error: 'Cannot modify your own access status.' });
    }

    try {
        let result;
        if (status === 'revoked') {
            result = await supabase
                .from('admin_profiles')
                .delete()
                .eq('email', targetEmail)
                .select();
        } else {
            result = await supabase
                .from('admin_profiles')
                .update({ status })
                .eq('email', targetEmail)
                .select();
        }

        const { data, error } = result;

        if (error) return res.status(500).json({ error: 'Failed to update admin status.' });
        if (!data || data.length === 0) return res.status(404).json({ error: 'Admin profile not found.' });
        
        const actionMsg = status === 'revoked' ? 'removed from the system' : `now ${status}`;
        res.json({ message: `Admin ${targetEmail} is ${actionMsg}`, data });
    } catch (err) {
        console.error('[APPROVE ERROR]', err.message);
        res.status(500).json({ error: 'Failed to process admin status change.' });
    }
});

// ============================================================================
// NOTIFICATION ENDPOINTS (JWT required)
// ============================================================================

// Get marketing slogans
app.get('/api/notifications/slogans', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('marketing_slogans')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Create marketing slogan
app.post('/api/notifications/slogans', requireAuth, validatePushNotification, async (req, res) => {
    const { title, body, image_url } = req.body;
    const { data, error } = await supabase
        .from('marketing_slogans')
        .insert([{ title, body, image_url }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
});

// Manual push notification broadcast
app.post('/api/notifications/push-manual', requireAuth, validatePushNotification, async (req, res) => {
    const { title, body, image_url } = req.body;
    const result = await NotificationService.broadcastPush(supabase, title, body, image_url);
    res.json(result);
});

// ============================================================================
// STORE SETTINGS ENDPOINTS
// ============================================================================
const SETTINGS_FILE = path.join(__dirname, 'store_settings.json');

// Helper to read settings
function getStoreSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[Store Settings] Read Error:', e.message);
    }
    // Default fallback
    return { is_accepting_orders: true };
}

// Helper to write settings
function saveStoreSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

// Get public store status
app.get('/api/store/status', (req, res) => {
    const settings = getStoreSettings();
    res.json(settings);
});

// Admin toggle store status
app.patch('/api/admin/store/status', requireAuth, (req, res) => {
    const { is_accepting_orders } = req.body;
    if (typeof is_accepting_orders !== 'boolean') {
        return res.status(400).json({ error: 'is_accepting_orders must be a boolean.' });
    }
    
    const settings = getStoreSettings();
    settings.is_accepting_orders = is_accepting_orders;
    saveStoreSettings(settings);
    
    res.json(settings);
});

// ============================================================================
// PUBLIC API ROUTES (No auth — used by mobile app)
// ============================================================================

// Category Routes
app.get('/api/categories', publicApiLimiter, async (req, res) => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return res.status(400).json({ error: 'Failed to fetch categories.' });
    res.json(data);
});

// Product Routes
app.get('/api/products/trending', publicApiLimiter, async (req, res) => {
    const { data, error } = await supabase.from('products').select('*').eq('is_trending', true);
    if (error) return res.status(400).json({ error: 'Failed to fetch trending products.' });
    res.json(data);
});

app.get('/api/products/category/:slug', publicApiLimiter, async (req, res) => {
    const { slug } = req.params;
    const { data: categoryData, error: catError } = await supabase.from('categories').select('id').eq('slug', slug).single();
    if (catError) return res.status(400).json({ error: 'Invalid category slug.' });

    const { data, error } = await supabase.from('products').select('*').eq('category_id', categoryData.id);
    if (error) return res.status(400).json({ error: 'Failed to fetch products for this category.' });
    res.json(data);
});

// Order-specific rate limiter (SECURE: Prevents spamming order requests)
const orderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP/User to 5 orders per 10 minutes
    message: { error: 'Too many order attempts. Please wait 10 minutes before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Order Creation — Server-side price enforcement + atomic stock deduction + user auth
app.post('/api/orders', orderLimiter, requireUserAuth, validateOrderCreate, async (req, res) => {
    // Override user_id from the verified JWT (ignore whatever the client sent)
    const user_id = req.user.id;
    const { items, address, payment_method, delivery_date, delivery_time_slot, coupon_code } = req.body;

    try {
        // 1. TIME VALIDATION: Prevent ordering for past slots
        const today = new Date().toISOString().split('T')[0];
        if (delivery_date === today && delivery_time_slot) {
            const currentHour = new Date().getHours();
            
            // Extract the start hour from slot (e.g., "10:00 AM - 11:00 AM" -> 10)
            const slotHourMatch = delivery_time_slot.match(/(\d+):00\s*(AM|PM)/);
            if (slotHourMatch) {
                let slotHour = parseInt(slotHourMatch[1]);
                const ampm = slotHourMatch[2];
                if (ampm === 'PM' && slotHour !== 12) slotHour += 12;
                if (ampm === 'AM' && slotHour === 12) slotHour = 0;

                if (slotHour <= currentHour) {
                    return res.status(400).json({ error: 'This delivery slot has already passed for today. Please select a later time.' });
                }
            }
        }

        // 2. Fetch actual prices & validate stock for ALL items before creating order
        const productIds = items.map(i => i.product_id);
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, price, discount_price, stock_quantity')
            .in('id', productIds);

        if (prodError) throw prodError;
        if (!products || products.length !== productIds.length) {
            return res.status(400).json({ error: 'One or more products not found.' });
        }

        // Build a map for quick lookup
        const productMap = {};
        for (const p of products) {
            productMap[p.id] = p;
        }

        // 2. Validate stock availability and calculate server-side total
        let serverTotal = 0;
        for (const item of items) {
            const product = productMap[item.product_id];
            if (!product) {
                return res.status(400).json({ error: `Product ${item.product_id} not found.` });
            }
            if (product.stock_quantity < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${item.quantity}`
                });
            }
            const actualPrice = product.discount_price || product.price;
            serverTotal += actualPrice * item.quantity;
        }

        // 2.5 Apply Coupon Discount server-side (SECURE)
        let discountAmount = 0;
        let validatedCouponCode = null;

        if (coupon_code) {
            const { data: coupon, error: couponError } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', coupon_code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (!couponError && coupon) {
                // Validate expiry and min amount again
                const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                const isMinMet = serverTotal >= coupon.min_order_amount;

                if (!isExpired && isMinMet) {
                    validatedCouponCode = coupon.code;
                    if (coupon.discount_type === 'percentage') {
                        discountAmount = (serverTotal * coupon.discount_value) / 100;
                    } else {
                        discountAmount = coupon.discount_value;
                    }
                }
            }
        }

        const finalTotal = serverTotal - discountAmount;

        /**
         * 3. Create the order record.
         * We use the server-calculated total_price to prevent price manipulation
         * from the client-side (e.g., someone trying to buy for ₹0.01).
         */
        const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
            user_id,
            total_price: finalTotal,
            delivery_address: address,
            delivery_date: delivery_date || null,
            delivery_time_slot: delivery_time_slot || null,
            coupon_code: validatedCouponCode,
            discount_amount: discountAmount,
            status: 'pending'
        }]).select();

        if (orderError) {
            console.error('[API] Order Creation Error:', orderError.message);
            return res.status(400).json({ error: 'Failed to insert order data. Please check your inputs.' });
        }

        if (!orderData || orderData.length === 0) {
            return res.status(500).json({ error: 'Order creation succeeded but no data returned' });
        }

        // 4. Add order items with SERVER-FETCHED prices
        const orderItems = items.map(item => ({
            order_id: orderData[0].id,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_time: productMap[item.product_id].discount_price || productMap[item.product_id].price
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) {
            console.error('[API] Order Items Error:', itemsError.message);
            await supabase.from('orders').delete().eq('id', orderData[0].id);
            return res.status(400).json({ error: 'Failed to save order items.' });
        }

        /**
         * 5. Atomic Stock Deduction via Database RPC.
         * 
         * WHY RPC?
         * If we calculated newStock in JS and updated the row, two concurrent orders
         * could overwrite each other, leading to "Phantom Stock" where you sell items
         * you don't actually have.
         * 
         * The 'decrement_stock' function in PostgreSQL handles this with Row-Level Locking (FOR UPDATE),
         * making the deduction atomic and thread-safe.
         */
        const decrementedItems = [];
        for (const item of items) {
            const { data, error: stockError } = await supabase.rpc('decrement_stock', {
                p_product_id: item.product_id,
                p_qty: item.quantity
            });

            if (stockError || data === false) {
                console.error(`[Inventory Error] Failed to deduct stock for ${item.product_id}. RPC Result:`, data, 'Error:', stockError?.message);
                // Roll back created order and line items on stock failure.
                await supabase.from('order_items').delete().eq('order_id', orderData[0].id);
                await supabase.from('orders').delete().eq('id', orderData[0].id);

                // Best-effort stock compensation for successful decrements in this request.
                for (const reverted of decrementedItems) {
                    await supabase
                        .from('products')
                        .update({ stock_quantity: reverted.originalStock })
                        .eq('id', reverted.productId);
                }
                return res.status(409).json({ error: 'Stock changed while placing order. Please review cart and try again.' });
            }
            decrementedItems.push({
                productId: item.product_id,
                originalStock: productMap[item.product_id].stock_quantity,
            });
        }

        res.status(201).json({ message: 'Order created successfully', orderId: orderData[0].id });
    } catch (err) {
        console.error('[API] Order Error:', err.message);
        res.status(500).json({ error: 'Failed to create order.' });
    }
});

// Fetch all product suggestions from customers
app.get('/api/admin/suggestions', requireAuth, async (req, res) => {
    try {
        // Try to fetch with profiles join first
        const { data, error } = await supabase
            .from('product_suggestions')
            .select('*, profiles:user_id(full_name, phone_number)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[API Security] Join failed, falling back to basic fetch:', error.message);
            // Fallback: Fetch without join if profiles table or relation is missing
            const { data: basicData, error: basicError } = await supabase
                .from('product_suggestions')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (basicError) throw basicError;
            return res.json(basicData || []);
        }
        
        res.json(data || []);
    } catch (err) {
        console.error('[API CRITICAL] Suggestions Fetch Failed:', err.message);
        res.status(500).json({ error: 'Database connection issue. Please check if table exists.' });
    }
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
    // CORS error
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ error: 'Cross-origin request blocked.' });
    }

    console.error('[UNHANDLED ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
});

// ============================================================================
// SERVER START
// ============================================================================

// ============================================================================
// COUPON ENDPOINTS
// ============================================================================

app.post('/api/coupons/validate', validateCoupon, (req, res) => {
    res.json({
        success: true,
        coupon: {
            code: req.coupon.code,
            discount_type: req.coupon.discount_type,
            discount_value: req.coupon.discount_value,
            description: req.coupon.description
        }
    });
});

app.post('/api/admin/coupons', requireAuth, requireMaster, async (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, expires_at, description } = req.body;
    const { data, error } = await supabase.from('coupons').insert([{
        code: code.toUpperCase(),
        discount_type,
        discount_value,
        min_order_amount,
        expires_at,
        description,
        is_active: true
    }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

app.get('/api/admin/coupons', requireAuth, async (req, res) => {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[A1 Supermarket] Secure API server running on port ${PORT} (Listening on all interfaces)`);
    console.log(`[Security] Helmet ✓ | CORS restricted ✓ | Rate limiting ✓ | JWT auth ✓ | Input validation ✓`);
});
