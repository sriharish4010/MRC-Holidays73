
async function test() {
    const url = 'https://mrc-holidays.onrender.com/api/auth/login';
    console.log('Testing login against:', url);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        const status = response.status;
        const data = await response.json();
        
        console.log('Status:', status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
