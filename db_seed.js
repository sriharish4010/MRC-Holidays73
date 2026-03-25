
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seed() {
    console.log('--- Seeding Database V2 ---');
    
    try {
        // 1. Ensure Admin User
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        console.log('Current user count:', userCount);

        if (userCount === 0) {
            console.log('Creating default admin user...');
            const hashedPassword = await bcryptjs.hash('admin123', 10);
            const { error: uError } = await supabase.from('users').insert({
                username: 'admin',
                email: 'admin@example.com',
                password_hash: hashedPassword,
                role: 'admin',
                name: 'System Admin',
                phone: '1234567890'
            });
            if (uError) {
                console.error('User insert error:', uError.message);
                return;
            }
            console.log('Admin user created successfully.');
        } else {
            console.log('User(s) already exist.');
        }

        // 2. Ensure Sample Booking if vehicles exist
        const { data: vehicles } = await supabase.from('vehicles').select('id, daily_rate').limit(1);
        if (!vehicles || vehicles.length === 0) {
            console.log('No vehicles found, skipping booking seed.');
            return;
        }

        const { count: bookingCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
        if (bookingCount === 0) {
            console.log('Creating sample booking...');
            const vehicle = vehicles[0];
            const { data: admin, error: aError } = await supabase.from('users').select('id').eq('username', 'admin').single();
            
            if (aError || !admin) {
                console.error('Admin user not found for booking seed:', aError?.message);
                return;
            }

            const { error: bError } = await supabase.from('bookings').insert({
                user_id: admin.id,
                vehicle_id: vehicle.id,
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 86400000 * 3).toISOString(),
                total_cost: (vehicle.daily_rate || 1000) * 3,
                status: 'confirmed',
                created_at: new Date()
            });
            if (bError) {
                console.error('Booking insert error:', bError.message);
            } else {
                console.log('Sample booking created successfully.');
            }
        }
    } catch (err) {
        console.error('CRITICAL SEED ERROR:', err);
    }

    console.log('Seeding process finished.');
}

seed();
