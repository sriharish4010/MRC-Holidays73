
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
s.from('booking_requests').insert({ 
    customer_name: 'Test', 
    customer_phone: '123',
    pickup_location: 'A',
    destination: 'B',
    status: 'pending'
}).then(r => console.log(JSON.stringify(r, null, 2)));
