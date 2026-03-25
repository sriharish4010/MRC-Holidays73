
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
    console.log('--- SCHEMA FIX SEED ---');
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    
    // Explicitly set schema
    const { error } = await s.schema('public').from('users').insert({
        username: 'admin',
        email: 'admin@example.com',
        password_hash: hashedPassword,
        role: 'admin',
        name: 'System Admin',
        phone: '1234567890'
    });
    
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Success!');
    }
}
run();
