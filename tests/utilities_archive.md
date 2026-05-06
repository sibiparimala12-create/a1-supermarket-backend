# 🛠️ A1 Supermarket: Project Utilities Archive

This document contains a consolidated collection of all development scripts, seeders, and security scanners used during the construction of the A1 Supermarket platform. These scripts are preserved here for future reference and review before final cleanup.

---

## 1. Data Integrity & Maintenance

### 1.1 `check_all_orders.js`
Checks for mismatches between order totals and the sum of individual order items.
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllOrders() {
    const { data: orders } = await supabase.from('orders').select('*');
    const { data: items } = await supabase.from('order_items').select('*');
    
    orders.forEach(order => {
        const orderItems = items.filter(i => i.order_id === order.id);
        const itemSum = orderItems.reduce((acc, i) => acc + (i.quantity * i.price_at_time), 0);
        if (order.total_price !== itemSum) {
            console.log(`Mismatch found! Order ID: ${order.id}`);
        } else {
            console.log(`Order ${order.id.substring(0, 8)} matches: ${order.total_price}`);
        }
    });
}
checkAllOrders();
```

### 1.2 `fix_data.js`
Reconciles and fixes order totals that don't match the sum of their items.
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixData() {
    const { data: orders } = await supabase.from('orders').select('*');
    const { data: items } = await supabase.from('order_items').select('*');

    for (const order of orders) {
        const orderItems = items.filter(i => i.order_id === order.id);
        const calculatedTotal = orderItems.reduce((acc, i) => acc + (i.quantity * i.price_at_time), 0);
        if (Number(order.total_price) !== calculatedTotal) {
            await supabase.from('orders').update({ total_price: calculatedTotal }).eq('id', order.id);
        }
    }
}
fixData();
```

---

## 2. Seeding & Database Setup

### 2.1 `seed_admin.js`
Generates and seeds a Master Admin account with a secure random password.
```javascript
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

async function runMigration() {
    const password = crypto.randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(password, 12);
    const { error } = await supabase.from('admin_profiles').upsert({ 
        email: 'sibiparimala12@gmail.com', 
        password_hash: hashedPassword,
        role: 'master', status: 'approved' 
    });
    console.log(`Credentials: email=sibiparimala12@gmail.com, password=${password}`);
}
runMigration();
```

### 2.2 `seed_premium_slogans.js`
Seeds the marketing slogans table with rich, categorized slogans and images.
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const premiumSlogans = [
    { title: 'Morning Essentials! 🥛', body: 'Fresh milk, bread, and eggs...', image_url: '...' },
    // ... more slogans
];
async function seedSlogans() {
    await supabase.from('marketing_slogans').insert(premiumSlogans);
}
seedSlogans();
```

---

## 3. Testing & Verification

### 3.1 `security_scan.js`
Performs an adversarial scan to verify RLS (Row Level Security) and prevent unauthorized access.
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function runSecurityScan() {
    const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const tables = ['admin_profiles', 'orders', 'products'];
    for (const table of tables) {
        const { error } = await publicClient.from(table).select('*').limit(1);
        console.log(error ? `[PASS] ${table} blocked` : `[FAIL] ${table} EXPOSED`);
    }
}
runSecurityScan();
```

### 3.2 `test_stats.js`
Verifies the calculation of dashboard statistics (Revenue, Low Stock, Categories).
```javascript
async function testStats() {
    const [ordersRes, productsRes, catsRes] = await Promise.all([
        supabase.from('orders').select('total_price'),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('categories').select('id')
    ]);
    const revenue = ordersRes.data?.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0) || 0;
    console.log({ revenue, totalProducts: productsRes.count });
}
testStats();
```

---

## 4. Third-Party Integrations

### 4.1 `whatsapp.js`
Handles inventory stock alerts via Twilio WhatsApp API.
```javascript
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendInventoryAlert(productName, currentStock) {
    await client.messages.create({
        body: `🚨 *A1 Supermarket Stock Alert*...`,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: '+919841784440'
    });
}
module.exports = { sendInventoryAlert };
```
