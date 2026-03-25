
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
s.from('users').insert({ username: 'test', password_hash: 'xxx', role: 'admin' }).then(r => console.log(r));
