/**
 * A1 Supermarket — JWT Authentication Middleware
 * Enterprise-grade auth guard for all admin endpoints.
 * 
 * - Verifies JWT signature using server-side secret
 * - Extracts admin identity from token payload (never from request body)
 * - Provides role-based access control (master vs secondary)
 * - Blocks expired, malformed, or missing tokens
 */
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('FATAL: Supabase credentials missing in auth middleware.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_EXPIRY = '24h';

/**
 * Generate a signed JWT for an authenticated admin.
 */
function generateToken(admin) {
    return jwt.sign(
        {
            email: admin.email,
            role: admin.role,
            status: admin.status,
            isApproved: admin.status === 'approved',
            iat: Math.floor(Date.now() / 1000),
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Middleware: Require a valid JWT on the request.
 * Sets req.admin = { email, role, status, isApproved }
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Provide a valid Bearer token.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Re-check admin state from DB to enforce revocation/role changes immediately.
        const { data: adminProfile, error } = await supabase
            .from('admin_profiles')
            .select('email, role, status')
            .eq('email', decoded.email)
            .single();

        if (error || !adminProfile) {
            return res.status(401).json({ error: 'Admin account not found.' });
        }
        if (adminProfile.status !== 'approved') {
            return res.status(403).json({ error: 'Account pending approval. Contact Master Admin.' });
        }

        req.admin = {
            email: adminProfile.email,
            role: adminProfile.role,
            status: adminProfile.status,
            isApproved: adminProfile.status === 'approved',
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }
}

/**
 * Middleware: Require master admin role.
 * Must be used AFTER requireAuth.
 */
function requireMaster(req, res, next) {
    if (!req.admin || req.admin.role !== 'master') {
        return res.status(403).json({ error: 'Forbidden. Master admin access required.' });
    }
    next();
}


/**
 * Middleware: Require a valid Supabase End-User JWT on the request.
 * 
 * HOW IT WORKS:
 * - This is used by the Mobile App to authenticate regular customers.
 * - It takes the JWT provided by Supabase Auth on the mobile device.
 * - It calls 'supabase.auth.getUser(token)' to verify the token is valid 
 *   and has not been tampered with.
 * - Sets req.user = { id, email, role } for use in protected routes like Order Creation.
 */
async function requireUserAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Provide a valid Bearer token.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            return res.status(401).json({ error: 'Invalid or expired authentication token.' });
        }

        req.user = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role, // Usually 'authenticated'
        };

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }
}

module.exports = { generateToken, requireAuth, requireMaster, requireUserAuth, JWT_SECRET };
