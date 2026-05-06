/**
 * A1 Supermarket — Secure Admin Seeder
 * Generates a random master admin password and prints it ONCE to console.
 * The password is never stored in source code.
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Seeding Master Admin with secure random password...\n');
    
    try {
        // Generate a secure random password
        const password = crypto.randomBytes(12).toString('base64url');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const { data, error } = await supabase
            .from('admin_profiles')
            .upsert({ 
                email: 'sibiparimala12@gmail.com', 
                password_hash: hashedPassword,
                role: 'master', 
                status: 'approved' 
            }, { onConflict: 'email' });
            
        if (error) {
            if (error.code === '42P01') {
                console.log('⚠️ Table "admin_profiles" does not exist. Please run the content of "add_admin_auth.sql" in your Supabase SQL Editor.');
            } else {
                console.error('Error seeding Master Admin:', error.message);
            }
        } else {
            console.log('✅ Master Admin seeded successfully!');
            console.log('╔══════════════════════════════════════════════════╗');
            console.log('║  MASTER ADMIN CREDENTIALS (SAVE THESE NOW!)     ║');
            console.log('╠══════════════════════════════════════════════════╣');
            console.log(`║  Email:    sibiparimala12@gmail.com              ║`);
            console.log(`║  Password: ${password.padEnd(38)}║`);
            console.log('╠══════════════════════════════════════════════════╣');
            console.log('║  ⚠️  This password is shown ONCE. Save it now!  ║');
            console.log('║  Use "Forgot Password" to reset if needed.      ║');
            console.log('╚══════════════════════════════════════════════════╝');
        }
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

runMigration();
