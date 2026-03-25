import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log('--- Checking booking_requests schema ---');
    
    // 1. Fetch one row to see columns in booking_requests
    const { data: recData } = await supabase.from('booking_requests').select('*').limit(1);
    console.log('Columns in booking_requests:', Object.keys(recData?.[0] || {}));

    // 2. Fetch one row from bookings
    const { data: bookData } = await supabase.from('bookings').select('*').limit(1);
    console.log('Columns in bookings:', Object.keys(bookData?.[0] || {}));

    // 3. Fetch unique types in vehicles
    const { data: vehData } = await supabase.from('vehicles').select('type');
    const uniqueTypes = [...new Set(vehData?.map(v => v.type) || [])];
    console.log('Existing types in vehicles:', uniqueTypes);
}

checkSchema();
