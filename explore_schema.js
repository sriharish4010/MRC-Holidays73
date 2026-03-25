
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function explore() {
    console.log('Exploring schema...');
    // Try to get a list of all tables in the current schema
    const { data, error } = await s.rpc('get_tables');
    if (error) {
        console.log('RPC get_tables failed (expected):', error.message);
        
        // Try information_schema
        console.log('Querying information_schema...');
        const { data: tables, error: sError } = await s
            .from('pg_tables') // This might work if exposed
            .select('tablename')
            .eq('schemaname', 'public');
        
        if (sError) {
            console.log('pg_tables query failed:', sError.message);
        } else {
            console.log('Public tables:', tables.map(t => t.tablename).join(', '));
        }
    } else {
        console.log('Tables:', data);
    }
}
explore();
