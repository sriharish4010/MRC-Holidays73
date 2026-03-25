import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAdmin() {
    console.log('--- Checking Admin User ---');
    console.log('URL:', process.env.SUPABASE_URL);
    
    // 1. Check by email
    const { data: byEmail, error: e1 } = await supabase
        .from('users')
        .select('id, email, username, role')
        .eq('email', 'admin@mrc.com')
        .maybeSingle();
    
    console.log('Result by email:', byEmail || 'Not found');
    if (e1) console.error('Error by email:', e1);

    // 2. Check by username
    const { data: byUsername, error: e2 } = await supabase
        .from('users')
        .select('id, email, username, role')
        .eq('username', 'admin')
        .maybeSingle();

    console.log('Result by username:', byUsername || 'Not found');
    if (e2) console.error('Error by username:', e2);

    // 3. List all users (limit 5)
    const { data: all, error: e3 } = await supabase
        .from('users')
        .select('email, username, role')
        .limit(5);
    
    console.log('First 5 users in DB:', all);
}

checkAdmin();
