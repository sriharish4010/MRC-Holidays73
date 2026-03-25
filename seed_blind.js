
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seed() {
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    console.log('Inserting admin...');
    const { error } = await supabase.from('users').insert({
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
        console.log('Success (probably)');
    }
}
seed();
