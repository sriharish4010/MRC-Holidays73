import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seed() {
    console.log('--- FINAL SEED ---');
    
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    
    // 1. Create Admin
    console.log('Creating Admin...');
    const { data: user, error: uError } = await supabase.from('users').insert({
        username: 'admin',
        email: 'admin@example.com',
        password_hash: hashedPassword,
        role: 'admin',
        name: 'System Admin',
        phone: '1234567890'
    }).select().single();
    
    if (uError) {
        console.error('Admin Create Error:', uError.message, uError.details, uError.hint);
    } else {
        console.log('Admin Created:', user.id);
    }
}

seed();
