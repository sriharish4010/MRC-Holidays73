const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runTests() {
    console.log("\n============================================");
    console.log("   SYSTEMATIC FUNCTIONALITY TEST REPORT");
    console.log("============================================\n");
    
    // 1. SMTP Test
    console.log("[1] Testing Email (SMTP) Configuration...");
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    try {
        await transporter.verify();
        console.log("   ✅ Valid Gmail App Password. Nodemailer is correctly authorized.");
    } catch (e) {
        console.log("   ❌ SMTP Error: Unable to authenticate.");
        console.log("      Detail: " + e.message);
    }

    // 2. WebSocket listener Setup
    console.log("\n[2] Testing Real-time WebSockets...");
    let wsConnected = false;
    let wsMessageReceived = null;
    const ws = new WebSocket('ws://localhost:5000');
    
    await new Promise((resolve) => {
        ws.on('open', () => {
            console.log("   ✅ WebSocket successfully connected to the running server.");
            wsConnected = true;
            // Subscribe to the table broadcasts
            ws.send(JSON.stringify({ type: 'subscribe', table: 'booking_requests' }));
            resolve();
        });
        ws.on('error', (err) => {
            console.log("   ❌ WebSocket Connection Error: " + err.message);
            resolve();
        });
    });

    ws.on('message', (msg) => {
        wsMessageReceived = JSON.parse(msg);
    });

    // 3. API Request
    console.log("\n[3] Triggering the Submission API...");
    const payload = {
        customer_name: 'SysTest User',
        customer_phone: '9999999999',
        pickup_location: 'Station',
        destination: 'Airport',
        purpose_of_trip: 'System Test',
        mode_of_transport: 'Car (5 seater)',
        start_date: '2026-10-10',
        visited_places: 'Test Location'
    };

    let reqId = null;
    try {
        const res = await fetch('http://localhost:5000/api/public/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            reqId = data.request.id;
            console.log("   ✅ API responded successfully. Created ID: " + reqId);
        } else {
            console.log("   ❌ API Request failed: " + data.error);
        }
    } catch (e) {
        console.log("   ❌ API Fetch Error: " + e.message);
    }

    // Wait slightly to let WebSocket propagate
    await new Promise(r => setTimeout(r, 1000));
    
    if (wsMessageReceived && wsMessageReceived.table === 'booking_requests' && wsMessageReceived.action === 'INSERT') {
        console.log("   ✅ WebSocket successfully intercepted the INSERT broadcast.");
    } else {
        console.log("   ❌ WebSocket did NOT receive the expected INSERT broadcast.");
        if (wsMessageReceived) console.log("      Received something else: ", wsMessageReceived);
    }
    ws.close();

    // 4. DB Verification
    console.log("\n[4] Verifying Supabase Database Insertion...");
    if (reqId) {
        const { data, error } = await supabaseAdmin
            .from('booking_requests')
            .select('*')
            .eq('id', reqId)
            .single();
            
        if (error) {
            console.log("   ❌ DB Lookup Error: " + error.message);
        } else if (data && data.customer_name === 'SysTest User') {
            console.log("   ✅ Data accurately saved into 'booking_requests' table.");
            console.log(`      Found record for: ${data.customer_name}`);
        } else {
            console.log("   ❌ Verification failed: Record not found in the Database.");
        }
        
        // Clean up test document
        await supabaseAdmin.from('booking_requests').delete().eq('id', reqId);
        console.log("   🧹 Cleaned up the test data from database.");
    }

    console.log("\n============================================");
    console.log("   TEST SUITE COMPLETE");
    console.log("============================================\n");
    process.exit(0);
}

runTests();
