
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
    console.log('Testing SERVICE Key...');
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) {
        console.error('SERVICE Key Error:', error.message, error.code);
    } else {
        console.log('SERVICE Key Success, Vehicles found:', data?.length || 0);
    }
}

test();
