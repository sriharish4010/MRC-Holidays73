
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    console.log('Checking USERS table...');
    const { data, error } = await s.from('users').select('*');
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Users count:', data.length);
        console.log('Usernames:', data.map(u => u.username).join(', '));
    }
}

check();
