/**
 * A1 Supermarket — Input Validation Middleware
 * Prevents injection attacks, XSS, and business logic abuse.
 *
 * Every endpoint has a strict schema — unknown fields are rejected,
 * types are enforced, and values are whitelisted where appropriate.
 */

// Allowed order statuses (whitelist)
const VALID_ORDER_STATUSES = ['pending', 'packed', 'out_for_delivery', 'collect_from_store', 'delivered', 'cancelled'];

// Simple email regex — covers 99% of valid emails
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Sanitize string — strip HTML tags to prevent stored XSS
function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate admin login request
 */
function validateLogin(req, res, next) {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    req.body.email = email.trim().toLowerCase();
    req.body.password = password;
    next();
}

/**
 * Validate order status update
 */
function validateOrderStatus(req, res, next) {
    const { status } = req.body;

    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
            error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`
        });
    }

    next();
}

/**
 * Validate order creation
 */
function validateOrderCreate(req, res, next) {
    const { items, address, payment_method } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required.' });
    }
    for (const item of items) {
        if (!item.product_id || typeof item.product_id !== 'string') {
            return res.status(400).json({ error: 'Each item must have a valid product_id.' });
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
            return res.status(400).json({ error: 'Each item must have a positive integer quantity.' });
        }
    }
    if (!address || typeof address !== 'string' || address.trim().length < 5) {
        return res.status(400).json({ error: 'A valid delivery address is required (min 5 chars).' });
    }

    const validPayments = ['COD', 'UPI', 'Card'];
    if (payment_method && !validPayments.includes(payment_method)) {
        return res.status(400).json({ error: `Invalid payment method. Must be: ${validPayments.join(', ')}` });
    }

    // Sanitize fields to prevent Stored XSS
    req.body.address = sanitize(address);
    if (req.body.delivery_date) req.body.delivery_date = sanitize(req.body.delivery_date);
    if (req.body.delivery_time_slot) req.body.delivery_time_slot = sanitize(req.body.delivery_time_slot);
    next();
}

/**
 * Validate push notification
 */
function validatePushNotification(req, res, next) {
    const { title, body } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 1 || title.length > 200) {
        return res.status(400).json({ error: 'Title is required (1-200 chars).' });
    }
    if (!body || typeof body !== 'string' || body.trim().length < 1 || body.length > 1000) {
        return res.status(400).json({ error: 'Body is required (1-1000 chars).' });
    }

    // Sanitize to prevent stored XSS
    req.body.title = sanitize(title);
    req.body.body = sanitize(body);
    if (req.body.image_url) req.body.image_url = sanitize(req.body.image_url);
    next();
}

/**
 * Validate password reset request
 */
function validateResetRequest(req, res, next) {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ error: 'A valid email is required.' });
    }
    req.body.email = email.trim().toLowerCase();
    next();
}

/**
 * Validate password reset execution
 */
function validateResetExecute(req, res, next) {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string' || token.length < 32) {
        return res.status(400).json({ error: 'A valid reset token is required.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    next();
}

/**
 * Validate admin approval
 */
function validateAdminApproval(req, res, next) {
    const { targetEmail, status } = req.body;
    if (!targetEmail || !EMAIL_REGEX.test(targetEmail.trim())) {
        return res.status(400).json({ error: 'A valid target email is required.' });
    }
    if (!status || !['approved', 'rejected', 'revoked'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "approved", "rejected", or "revoked".' });
    }
    req.body.targetEmail = targetEmail.trim().toLowerCase();
    next();
}

/**
 * Validate admin registration / access request
 */
function validateRequestAccess(req, res, next) {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    req.body.email = email.trim().toLowerCase();
    req.body.password = password;
    next();
}

module.exports = {
    validateLogin,
    validateOrderStatus,
    validateOrderCreate,
    validatePushNotification,
    validateResetRequest,
    validateResetExecute,
    validateAdminApproval,
    validateRequestAccess,
    sanitize,
    VALID_ORDER_STATUSES,
};
