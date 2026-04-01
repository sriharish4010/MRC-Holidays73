import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function dumpVehicles() {
    const { data: vehicles, error } = await supabase.from('vehicles').select('*');
    if (error) {
        console.error('Error fetching vehicles:', error);
        return;
    }
    console.log('--- Raw Vehicles in DB ---');
    vehicles.forEach(v => {
        console.log(JSON.stringify(v));
    });
}

dumpVehicles();
