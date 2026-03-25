
import fetch from 'node-fetch';

async function test() {
    console.log('--- REGISTER TEST (API) ---');
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: 'admin', 
                password: 'admin123',
                email: 'admin@mrc.com',
                name: 'Admin',
                phone: '123'
            })
        });
        
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
