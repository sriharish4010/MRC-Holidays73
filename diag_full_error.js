
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
    console.log('--- DIAG FULL ERROR ---');
    const res = await s.from('users').select('*').limit(1);
    console.log(JSON.stringify(res, null, 2));
}

run();
