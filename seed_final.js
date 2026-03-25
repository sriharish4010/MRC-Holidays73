
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seed() {
    console.log('--- FINAL SEED ---');
    
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    
    // 1. Create Admin
    console.log('Creating Admin...');
    const { data: user, error: uError } = await supabase.from('users').insert({
        username: 'admin',
        email: 'admin@example.com',
        password_hash: hashedPassword,
        role: 'admin',
        name: 'System Admin',
        phone: '1234567890'
    }).select().single();
    
    if (uError) {
        console.error('Admin Create Error:', uError.message);
    } else {
        console.log('Admin Created:', user.id);
    }

    // 2. Create Sample Vehicle (since fleet is empty)
    console.log('Creating Sample Vehicle...');
    const { data: vehicle, error: vError } = await supabase.from('vehicles').insert({
        name: 'Mercedes-Benz Sprinter',
        type: 'van',
        license_plate: 'MRC-001',
        daily_rate: 5000,
        capacity: 12,
        location: 'Chennai',
        fuel_type: 'diesel',
        status: 'available',
        features: { category: 'van', model: 'Sprinter' }
    }).select().single();

    if (vError) {
        console.error('Vehicle Create Error:', vError.message);
    } else {
        console.log('Vehicle Created:', vehicle.id);
    }

    console.log('--- SEED COMPLETE ---');
}

seed();
