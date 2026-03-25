
import bcryptjs from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
    const { data: user, error } = await supabase.from('users').select('*').eq('username', 'admin').single();
    if (error || !user) {
        console.error('User not found');
        return;
    }
    
    const match = await bcryptjs.compare('admin123', user.password_hash);
    console.log('Login Test (admin / admin123):', match ? 'SUCCESS ✅' : 'FAILED ❌');
    
    if (!match) {
        console.log('Updating password to admin123...');
        const newHash = await bcryptjs.hash('admin123', 10);
        await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id);
        console.log('Password updated successfully.');
    }
}

test();
