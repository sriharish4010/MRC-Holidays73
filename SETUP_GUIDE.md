# 🚀 Complete System Setup Guide

## System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    USER BROWSER                             │
│  (HTML, CSS, JavaScript Frontend)                           │
│  - admin-login.html                                         │
│  - admin-dashboard.html                                     │
│  - user-login.html                                          │
│  - user-signup.html                                         │
│  - user-dashboard.html                                      │
└────────────────────────────────┬───────────────────────────┘
                                 │
                    REST API Calls (HTTP/HTTPS)
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────┐
│                  NODE.JS/EXPRESS SERVER                     │
│  Port: 5000                                                 │
│  - server.js (Main API)                                     │
│  - Authentication Routes                                    │
│  - Vehicle Management Routes                                │
│  - Booking Routes                                           │
│  - Customer Routes                                          │
│  - Admin Analytics Routes                                   │
└────────────────┬───────────────────────────┬───────────────┘
                 │                           │
                 ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │    MYSQL DATABASE    │    │   REDIS CACHE        │
    │  (Persistent Store)  │    │ (Real-time + Session)│
    │                      │    │                      │
    │ - Users              │    │ - User Sessions      │
    │ - Vehicles           │    │ - Vehicle Cache      │
    │ - Bookings           │    │ - Booking Cache      │
    │ - Payments           │    │ - Analytics          │
    │ - Reviews            │    │                      │
    └──────────────────────┘    └──────────────────────┘
```

## Step 1: Prerequisites Installation

### Windows Setup

#### 1.1 Install Node.js
- Download from https://nodejs.org/
- Choose LTS version
- Run installer and follow prompts
- Verify installation:
```bash
node --version
npm --version
```

#### 1.2 Install MySQL
- Download from https://dev.mysql.com/downloads/mysql/
- Windows MSI Installer recommended
- During setup:
  - MySQL Server: 3306 (default port)
  - MySQL Workbench: Optional but recommended
  - User: root
  - Password: Set your password

#### 1.3 Install Redis
- Download from https://github.com/microsoftarchive/redis/releases
- Or use Windows Subsystem for Linux (WSL)
- Start Redis server:
```bash
redis-server
# In another terminal:
redis-cli  # Test connection
```

## Step 2: Backend Setup

### 2.1 Initialize Project
```bash
cd d:\team mrc
npm install
```

### 2.2 Create MySQL Database
```bash
# Option 1: Using command line
mysql -u root -p < database_schema.sql

# Option 2: Using MySQL Workbench
# 1. Open MySQL Workbench
# 2. Create new connection
# 3. Execute database_schema.sql
# 4. Verify: Check vehicle_rental database created
```

### 2.3 Configure Environment
Edit `.env` file in project root:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=vehicle_rental

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=change-this-to-random-string-in-production

# URLs
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### 2.4 Start Backend Server
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

Expected output:
```
🚗 Vehicle Rental API running on http://localhost:5000
```

## Step 3: Frontend Setup

### 3.1 Frontend Files Location
Your frontend files are in: `d:\team mrc`

Files created:
- `admin-login.html` - Admin authentication
- `admin-dashboard.html` - Admin panel
- `user-login.html` - User authentication  
- `user-signup.html` - User registration
- `user-dashboard.html` - User panel

### 3.2 Serve Frontend
#### Option A: Using Vite (Recommended)
```bash
npm run dev
# Starts on http://localhost:5173
```

#### Option B: Using Live Server Extension
1. Install "Live Server" VS Code extension
2. Right-click any HTML file
3. Select "Open with Live Server"
4. Runs on http://127.0.0.1:5500

#### Option C: Using Python
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
# Access: http://localhost:8000
```

## Step 4: Verify Installation

### 4.1 Check Backend Health
```bash
curl http://localhost:5000/api/health
# Expected: {"status":"OK","timestamp":"..."}
```

### 4.2 Test Database Connection
In Node.js console:
```javascript
const mysql = require('mysql2/promise');
const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'vehicle_rental'
});
const [rows] = await conn.execute('SELECT * FROM users');
console.log(rows);
```

### 4.3 Test Redis Connection
```bash
redis-cli ping
# Expected: PONG
```

### 4.4 Test Frontend & Backend Connection
1. Start backend: `npm run dev` (Terminal 1)
2. Start frontend: `npm run dev` (Terminal 2)
3. Open browser: http://localhost:5173
4. Navigate to user login
5. Check browser console for API calls

## Step 5: Testing the System

### 5.1 Test User Registration
1. Open `http://localhost:5173/user-signup.html`
2. Fill registration form
3. Complete OTP verification (Demo: 123456)
4. Check MySQL: `SELECT * FROM users;`

### 5.2 Test User Login
1. Open `http://localhost:5173/user-login.html`
2. Login with registered credentials
3. Check localStorage for token
4. Verify redirect to dashboard

### 5.3 Test Admin Login
1. Open `http://localhost:5173/admin-login.html`
2. Demo credentials: `admin` / `password123`
3. Access admin panel
4. Try adding vehicles, viewing analytics

### 5.4 Test Bookings
1. Login as user
2. Browse vehicles
3. Create booking with date range
4. Verify in MySQL: `SELECT * FROM bookings;`
5. Check vehicle status updated to 'booked'

## Step 6: API Testing

### 6.1 Using cURL or Postman

#### Login API
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

#### Get Vehicles
```bash
curl http://localhost:5000/api/vehicles
```

#### Create Booking (with token)
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "vehicleId": 1,
    "startDate": "2026-03-20",
    "endDate": "2026-03-25"
  }'
```

### 6.2 Using Postman
1. Download Postman from postman.com
2. Create new collection
3. Add requests with proper:
   - URL: http://localhost:5000/api/...
   - Method: GET/POST/PATCH/DELETE
   - Headers: Authorization: Bearer {token}
   - Body: JSON data

## Step 7: Troubleshooting

### Problem: "Cannot find module 'express'"
```bash
npm install
```

### Problem: MySQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
Solution:
```bash
# Windows: Start MySQL Service
net start MySQL80
# Or use Services app
```

### Problem: Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
Solution:
```bash
# Start Redis
redis-server
# Test: redis-cli ping
```

### Problem: CORS Error in Browser
Check `.env` FRONTEND_URL matches your server URL
```env
FRONTEND_URL=http://localhost:5173
```

### Problem: Token Expired
- Tokens expire in 24 hours
- Re-login to get new token
- Check localStorage for valid token

### Problem: Database Doesn't Connect
```bash
# Test MySQL access
mysql -u root -p
# Check database exists
SHOW DATABASES;
USE vehicle_rental;
SHOW TABLES;
```

## Step 8: Development Workflow

### File Structure
```
d:\team mrc\
├── server.js                 # Main backend server
├── package.json              # Dependencies
├── .env                       # Configuration
├── database_schema.sql        # Database schema
├── middleware_auth.js         # Authentication
├── BACKEND_README.md          # API docs
│
├── admin-login.html           # Admin login
├── admin-dashboard.html       # Admin panel
├── user-login.html            # User login
├── user-signup.html           # User signup
├── user-dashboard.html        # User panel
│
├── index.html                 # Home page
├── main.ts                    # Frontend main
├── vite.config.js             # Vite config
├── tsconfig.json              # TypeScript config
```

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Debugging
```bash
# Enable debug logs
NODE_DEBUG=* npm run dev

# Debug specific module
DEBUG=express:* npm run dev
```

## Step 9: Deployment Checklist

Before going to production:
- [ ] Change JWT_SECRET to random 32+ char string
- [ ] Update DB_PASSWORD to strong password
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS (SSL certificate)
- [ ] Add rate limiting
- [ ] Setup error logging (Sentry)
- [ ] Configure backups (MySQL, Redis)
- [ ] Setup monitoring
- [ ] Add user input validation
- [ ] Test all edge cases

## Step 10: Common Development Tasks

### Add New API Endpoint
```javascript
// In server.js
app.get('/api/new-endpoint', async (req, res) => {
    // Your code here
});
```

### Add Database Migration
```sql
-- Add new column
ALTER TABLE vehicles ADD COLUMN insurance_required BOOLEAN DEFAULT FALSE;

-- Query to test
SELECT * FROM vehicles;
```

### Clear Cache
```javascript
// In Node.js
await redisClient.flushAll();
```

### Reset Database
```bash
mysql -u root -p vehicle_rental < database_schema.sql
```

## Support & Resources

- **Node.js Docs**: https://nodejs.org/docs
- **Express Docs**: https://expressjs.com
- **MySQL Docs**: https://dev.mysql.com/doc
- **Redis Docs**: https://redis.io/documentation
- **JWT Docs**: https://jwt.io
- **Postman**: https://www.postman.com

---

**✅ System is now ready for development!**

For issues or questions, refer to BACKEND_README.md for API documentation.
