fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
})
.then(r => Promise.all([r.status, r.json()]))
.then(console.log)
.catch(console.error);
