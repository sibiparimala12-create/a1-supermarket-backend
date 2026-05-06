# 🧪 A1 Supermarket: Comprehensive Test Plan

This document serves as the official test documentation for the A1 Supermarket ecosystem. It outlines the test strategy, environment setup, and detailed test cases for both automated and manual verification.

---

## 1. Test Strategy

| Test Level | Scope | Tools |
| :--- | :--- | :--- |
| **Security Audit** | JWT, RLS, XSS, TOCTOU Race Conditions | `security_scan.js` (Archived) |
| **Inventory Logic** | Atomic Stock Deduction, Low Stock Alerts | `decrement_stock` RPC Tests |
| **Order Flow** | End-to-End Checkout, Pre-order Logic | Manual + `check_all_orders.js` |
| **Notifications** | Push Gateway, WhatsApp Delivery | `notifications.js` Logic |

---

## 2. Test Environment Setup

- **Backend**: Node.js 18+, Express, JWT
- **Database**: Supabase (PostgreSQL)
- **Mobile**: Expo SDK 50+, React Native
- **Requirements**: `.env` file must be populated with valid `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET`.

---

## 3. Core Test Cases

### 3.1 Security & Authentication
- **TC-AUTH-01**: Verify that Master Admin endpoints reject Secondary Admin tokens.
- **TC-AUTH-02**: Verify that all public APIs are protected by `publicApiLimiter` (Rate Limiting).
- **TC-AUTH-03**: Verify that raw Database error messages are masked with generic JSON errors.

### 3.2 Inventory Management
- **TC-INV-01**: **Atomic Deduction Test** — Verify that concurrent orders do not lead to "Phantom Stock" errors. 
- **TC-INV-02**: **Low Stock Trigger** — Verify that stock < 10 triggers a WhatsApp alert to the admin.
- **TC-INV-03**: **Zero Stock Blocking** — Verify that products with 0 quantity cannot be added to the cart.

### 3.3 Order & Pre-order Flow
- **TC-ORD-01**: **After-Hours Logic** — Verify that between 10 PM and 10 AM, the app automatically switches to "Pre-order" mode.
- **TC-ORD-02**: **Manual Toggle** — Verify that if the admin flips the "Accepting Orders" toggle to OFF, the app immediately requires a delivery slot.
- **TC-ORD-03**: **Slot Validation** — Verify that orders placed with a delivery slot are correctly tagged with `delivery_date` and `delivery_time_slot` in the DB.

### 3.4 Notifications
- **TC-NOT-01**: **Broadcast Push** — Verify that the admin can send a mass push notification to all users with `ExponentPushToken`.
- **TC-NOT-02**: **Real-time Alerts** — Verify that new orders trigger an immediate pop-up on the Admin Dashboard.

---

## 4. How to Execute Automated Scripts

All historical test and utility scripts have been consolidated into the **Utilities Archive**. To run a specific test, copy the relevant script into a `.js` file and execute:

```bash
node <test_filename>.js
```

### Key Scripts Reference:
- **`security_scan.js`**: Simulates a hacker trying to access unauthorized data.
- **`check_all_orders.js`**: Validates that all order totals match their line items.
- **`test_stats.js`**: Verifies dashboard analytics accuracy.

---

## 5. Maintenance Checklist for Testers
1. Ensure `decrement_stock` RPC is installed in Supabase.
2. Verify that Twilio credentials are active for WhatsApp alerts.
3. Check Expo Push Notification quotas.
