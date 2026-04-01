
const API_URL = 'http://127.0.0.1:5000/api';
const loginData = {
    username: 'admin',
    password: 'admin123' // Seeding script uses admin123
};

async function test() {
    console.log('--- Verifying Analytics Data Structure ---');
    try {
        // 1. Login
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

        // 2. Fetch Analytics
        const resp = await fetch(`${API_URL}/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();

        console.log('Analytics Response:', {
            totalVehicles: data.totalVehicles,
            totalBookings: data.totalBookings,
            confirmedCount: data.confirmedCount,
            rejectedCount: data.rejectedCount,
            hasMonthlyStats: !!data.monthlyStats,
            hasYearlyStats: !!data.yearlyStats,
            sampleMonth: data.monthlyStats ? Object.keys(data.monthlyStats)[0] : 'N/A'
        });

        if (data.monthlyStats) {
            console.log('Monthly Stats structure is correct.');
        } else {
            console.error('Monthly Stats MISSING!');
        }

    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

test();
