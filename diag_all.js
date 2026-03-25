
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function diag() {
    console.log('--- DIAGNOSTICS ---');
    
    // 1. Check Admin User
    console.log('1. Checking Admin user...');
    const { data: user, error: uError } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'admin')
        .single();
    
    if (uError) {
        console.error('❌ Admin user not found or error:', uError.message);
    } else {
        console.log('✅ Admin user found:', user.username, 'Role:', user.role);
    }

    // 2. Check Buckets
    console.log('\n2. Checking Storage buckets...');
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
        console.error('❌ Error listing buckets:', bError.message);
    } else {
        console.log('✅ Buckets:', buckets.map(b => b.name).join(', '));
        const hasBucket = buckets.some(b => b.name === 'vehicle-media');
        if (!hasBucket) {
            console.log('⚠️ Bucket "vehicle-media" MISSING. Creating it...');
            const { error: cError } = await supabase.storage.createBucket('vehicle-media', { public: true });
            if (cError) {
                console.error('❌ Failed to create bucket:', cError.message);
            } else {
                console.log('✅ Bucket "vehicle-media" created successfully.');
            }
        }
    }

    // 3. Check bucket's public access
    console.log('\n3. Verifying bucket public access...');
    const { data: bucketInfo } = await supabase.storage.getBucket('vehicle-media');
    if (bucketInfo && !bucketInfo.public) {
        console.log('⚠️ Bucket is NOT public. Updating...');
        await supabase.storage.updateBucket('vehicle-media', { public: true });
        console.log('✅ Bucket updated to public.');
    } else {
        console.log('✅ Bucket is public.');
    }

    console.log('\n--- DIAGNOSTICS COMPLETE ---');
}

diag();
