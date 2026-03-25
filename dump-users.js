import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
s.from('users').select('*').limit(5).then(d => {
    fs.writeFileSync('users_dump.json', JSON.stringify(d.data, null, 2));
    console.log('Done');
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
