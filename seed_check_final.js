
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
    console.log('--- SEED & CHECK ---');
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    
    // 1. Insert
    console.log('Attempting Insert...');
    const { data: user, error: uError } = await s.from('users').insert({
        username: 'admin',
        email: 'admin@example.com',
        password_hash: hashedPassword,
        role: 'admin',
        name: 'System Admin',
        phone: '1234567890'
    }).select().single();
    
    if (uError) {
        console.error('Insert Error:', uError.message);
    } else {
        console.log('Insert Success! User ID:', user.id);
    }

    // 2. Immediate Check
    console.log('\nChecking table count immediately...');
    const { data: users, error: sError } = await s.from('users').select('*');
    if (sError) {
        console.error('Select Error:', sError.message);
    } else {
        console.log('Users in table:', users.length);
        console.log('Usernames:', users.map(u => u.username).join(', '));
    }
}

run();
