
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

console.log('--- Database Audit V2 (Enhanced) ---');
console.log('URL:', process.env.SUPABASE_URL);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function audit() {
    try {
        const tables = ['vehicles', 'vehicle_media', 'booking_requests', 'bookings', 'users'];
        
        for (const table of tables) {
            console.log(`Checking table: ${table}...`);
            const { count, error, status } = await supabase.from(table).select('*', { count: 'exact', head: true });
            
            if (error) {
                console.log(`Table '${table}': ERROR (Status: ${status}, Code: ${error.code}, Message: ${error.message})`);
            } else {
                console.log(`Table '${table}': EXISTS, count=${count || 0}`);
            }
        }
    } catch (err) {
        console.error('AUDIT CRITICAL ERROR:', err);
    }
}

audit().then(() => console.log('Audit complete')).catch(err => console.error('Final catch:', err));
