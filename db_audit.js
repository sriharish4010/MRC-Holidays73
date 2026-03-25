
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function audit() {
    console.log('--- Database Audit ---');
    
    // Check vehicles features.media
    const { data: vehicles, error: vError } = await supabase.from('vehicles').select('id, name, features');
    if (vError) console.error('Error fetching vehicles:', vError.message);
    else {
        const withJsonMedia = vehicles.filter(v => v.features?.media?.length > 0);
        console.log(`Vehicles with media in features JSONB: ${withJsonMedia.length} / ${vehicles.length}`);
    }

    // Check vehicle_media table
    const { data: media, error: mError } = await supabase.from('vehicle_media').select('count', { count: 'exact' });
    if (mError) {
        console.log('vehicle_media table status: MISSING or ERROR (' + mError.code + ': ' + mError.message + ')');
    } else {
        console.log(`vehicle_media table status: EXISTS, Items: ${media.length > 0 ? media[0].count : 0}`);
    }

    // Check booking_requests
    const { data: reqs, error: rError } = await supabase.from('booking_requests').select('count', { count: 'exact' });
    if (rError) {
        console.log('booking_requests table status: MISSING or ERROR (' + rError.code + ': ' + rError.message + ')');
    } else {
        console.log(`booking_requests table status: EXISTS, Items: ${reqs.length > 0 ? reqs[0].count : 0}`);
    }
}

audit();
