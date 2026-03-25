
import fetch from 'node-fetch';

async function test() {
    console.log('--- LOGIN TEST (API) ---');
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
