
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
    console.log('Testing ANON Key...');
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) {
        console.error('ANON Key Error:', error.message, error.code);
    } else {
        console.log('ANON Key Success, Vehicles found:', data.length);
    }
}

test();
