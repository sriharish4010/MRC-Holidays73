require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('vehicle_media').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('Table is empty, trying to fetch schema info? No, let\'s try to insert a dummy and rollback? No.');
        // If empty, I'll just assume standard columns from previous logs or try to fetch one with id.
        console.log('Table is empty.');
    }
}
check();
