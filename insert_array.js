
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    const { data, error } = await s.from('users').insert([
        { 
            username: 'admin', 
            email: 'admin@mrc.com', 
            password_hash: hashedPassword, 
            role: 'admin', 
            name: 'Admin', 
            phone: '123' 
        }
    ]).select();
    
    if (error) {
        console.error('Error:', error.message);
        console.error('Details:', error.details);
    } else {
        console.log('Success:', data);
    }
}
run();
