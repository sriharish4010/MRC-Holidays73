
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
    console.log('Target Supabase URL:', process.env.SUPABASE_URL);
    
    // Check if user exists
    let { data: user, error } = await supabase.from('users').select('*').eq('username', 'admin').single();
    
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    
    if (user) {
        console.log('Admin user found. Updating password to admin123...');
        const { error: updateError } = await supabase.from('users')
            .update({ password_hash: hashedPassword, role: 'admin' })
            .eq('id', user.id);
            
        if (updateError) {
            console.error('Update Error:', updateError.message);
        } else {
            console.log('Password updated successfully.');
        }
    } else {
        console.log('Admin user not found. Creating user admin / admin123...');
        const { data: newUser, error: insertError } = await supabase.from('users').insert({
            username: 'admin',
            email: 'admin@example.com',
            password_hash: hashedPassword,
            role: 'admin',
            name: 'System Admin',
            phone: '1234567890'
        }).select().single();
        
        if (insertError) {
            console.error('Insert Error:', insertError.message);
        } else {
            console.log('Admin user created successfully.');
        }
    }
}

fix();
