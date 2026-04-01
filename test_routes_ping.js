
const API_URL = 'http://127.0.0.1:5000/api';
const loginData = {
    username: 'admin', // assuming default
    password: 'admin' 
};

async function test() {
    console.log('--- Testing API Routes ---');
    try {
        // 1. Health check
        const health = await fetch('http://127.0.0.1:5000/health').then(r => r.json());
        console.log('Health:', health);

        // 2. Login as admin
        const login = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        }).then(r => r.json());

        if (login.error) {
            console.error('Login failed:', login.error);
            return;
        }
        const token = login.token;
        console.log('Login: Success (Token received)');

        // 3. Test Admin Routes
        const endpoints = [
            '/admin/booking-requests',
            '/admin/all-bookings',
            '/users',
            '/admin/analytics'
        ];

        for (const endpoint of endpoints) {
            const resp = await fetch(`${API_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            console.log(`GET ${endpoint}:`, resp.ok ? 'OK (Array/Object received)' : `FAILED: ${data.error}`);
            if (resp.headers.get('content-type')?.includes('application/json')) {
                if (Array.isArray(data)) {
                    console.log(`   Items: ${data.length}`);
                }
            }
        }

    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

test();
