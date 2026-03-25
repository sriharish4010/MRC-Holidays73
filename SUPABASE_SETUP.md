# 🎯 Placement-Level Project Setup - Supabase + Real-time

## 🚀 What You Have

A **production-ready** vehicle rental system with:
- ✅ **Supabase PostgreSQL** (Cloud Database)
- ✅ **Real-time WebSocket Updates**
- ✅ **Redis Cache Layer** (Azure)
- ✅ **JWT Authentication**
- ✅ **Placement-level Architecture**

---

## 📊 System Architecture

```
User (Browser)
    ↓
Frontend (HTML/CSS/JS + Supabase Client)
    ↓
Backend (Express + WebSocket)
    ↓
├── Supabase PostgreSQL (Data)
├── Redis (Cache)
└── Real-time Channel (WebSocket)
    ↓
Real-time Broadcast to All Clients
```

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
cd d:\team mrc
npm install
```

**What gets installed:**
- `@supabase/supabase-js` - Supabase client library
- `express` - Backend framework
- `redis` - Cache client
- `ws` - WebSocket support
- `jsonwebtoken` - JWT auth
- `bcryptjs` - Password hashing

### Step 2: Verify Environment Variables

Your `.env` file now has:

```env
# Supabase Configuration
SUPABASE_URL=https://czocnfvusoybakoohwzm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redis Configuration
REDIS_URL=redis-15995.c56.east-us.azure.cloud.redislabs.com:15995
```

✅ All credentials are already set!

### Step 3: Create Database Tables in Supabase

1. Go to https://app.supabase.com
2. Open your project (czocnfvusoybakoohwzm)
3. Go to **SQL Editor** → **New Query**
4. Copy contents of `supabase-schema.sql`
5. Paste and execute
6. Wait for success message ✅

**This creates:**
- users, vehicles, bookings, payments, reviews, sms_verification, audit_log tables
- Indexes for performance
- Row-level security (RLS) policies
- Real-time replication setup

### Step 4: Start the Backend

```bash
npm run server:dev
```

**What happens:**
```
✅ Express server starts on http://localhost:5000
✅ WebSocket server starts on ws://localhost:5000
✅ Connected to Supabase
✅ Connected to Redis
✅ Real-time subscriptions active
```

### Step 5: Start the Frontend

```bash
npm run dev
```

**What happens:**
```
✅ Vite dev server starts on http://localhost:5173
✅ HTML pages accessible
✅ Real-time updates working
```

### Step 6: Test the System

**In Browser #1 (http://localhost:5173):**
1. Open `user-login.html`
2. Login: `john@example.com` / `password123`
3. See your bookings
4. Browse vehicles

**In Browser #2:**
1. Open `admin-dashboard.html`
2. Login: `admin` / `admin123`
3. Create a new vehicle
4. Watch real-time update in Browser #1! 📡

---

## 📡 Real-time Features

### WebSocket Real-time Updates

Every action broadcasts to all connected clients:

```
Create Booking
    ↓
Backend processes
    ↓
Broadcast via WebSocket
    ↓
All browsers get update instantly 🎯
```

### Available Updates

1. **Vehicle Status Changes**
   ```json
   {
     "table": "vehicles",
     "action": "UPDATE",
     "data": { "id": "xxx", "status": "booked" }
   }
   ```

2. **New Bookings**
   ```json
   {
     "table": "bookings",
     "action": "INSERT",
     "data": { "id": "xxx", "vehicle_id": "yyy" }
   }
   ```

3. **User Updates**
   ```json
   {
     "table": "users",
     "action": "UPDATE",
     "data": { "id": "xxx", "name": "New Name" }
   }
   ```

---

## 🔐 Security Features

### Database Security (Row-Level Security)
- ✅ Users can only see their own data
- ✅ Admins can see all data
- ✅ Automatic enforcement in Supabase

### API Security
- ✅ JWT token validation on all routes
- ✅ Role-based access control
- ✅ Password hashing (bcryptjs)
- ✅ Input validation
- ✅ CORS protection
- ✅ Helmet.js security headers

### Environment Security
- ✅ Service keys kept private (.env)
- ✅ Credentials not in frontend code
- ✅ Public key only exposed to client

---

## 📝 API Endpoints

### Authentication

**Register**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "9876543210"
}

Response:
{
  "user": { "id": "xxx", "email": "...", "name": "..." },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Vehicles

**Get All Vehicles**
```bash
GET /api/vehicles

Response:
[
  {
    "id": "xxx",
    "name": "Toyota Fortuner",
    "type": "suv",
    "daily_rate": 2500,
    "status": "available"
  },
  ...
]
```

**Create Vehicle (Admin)**
```bash
POST /api/vehicles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Honda Accord",
  "type": "sedan",
  "license_plate": "DL-02-CD-5678",
  "daily_rate": 1800,
  "location": "Delhi",
  "capacity": 5,
  "fuel_type": "petrol"
}
```

### Bookings

**Create Booking**
```bash
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicle_id": "xxx",
  "start_date": "2026-03-20T09:00:00Z",
  "end_date": "2026-03-25T18:00:00Z"
}

Response:
{
  "id": "xxx",
  "total_cost": 12500,
  "status": "confirmed"
}
```

**Get My Bookings**
```bash
GET /api/bookings
Authorization: Bearer <token>

Response: [booking1, booking2, ...]
```

### Analytics

**Get Dashboard Stats (Admin)**
```bash
GET /api/admin/analytics
Authorization: Bearer <token>

Response:
{
  "totalVehicles": 5,
  "totalBookings": 12,
  "totalUsers": 3,
  "totalRevenue": 45000
}
```

---

## 📊 Database Schema

### users
```sql
- id (UUID, primary key)
- email (VARCHAR, unique)
- password_hash (VARCHAR)
- name (VARCHAR)
- phone (VARCHAR, unique)
- role (admin | user | manager)
- license_number (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### vehicles
```sql
- id (UUID, primary key)
- name (VARCHAR)
- type (sedan | suv | truck | van | bike | luxury)
- license_plate (VARCHAR, unique)
- daily_rate (DECIMAL)
- location (VARCHAR)
- capacity (INT)
- fuel_type (petrol | diesel | electric | hybrid)
- status (available | booked | maintenance | inactive)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### bookings
```sql
- id (UUID, primary key)
- user_id (FK → users)
- vehicle_id (FK → vehicles)
- start_date (TIMESTAMP)
- end_date (TIMESTAMP)
- total_cost (DECIMAL)
- status (pending | confirmed | completed | cancelled)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🎨 Frontend Integration

### Using Real-time in HTML Pages

```html
<!-- Include client library -->
<script type="module">
  import { 
    subscribeToVehicles,
    getVehicles,
    connectWebSocket,
    loginUser
  } from './supabase-client.js';

  // Connect to real-time updates
  connectWebSocket((update) => {
    console.log('Real-time update:', update);
    // Refresh UI
  });

  // Subscribe to vehicle changes
  subscribeToVehicles((update) => {
    console.log('Vehicle changed:', update);
    // Update vehicle list
  });
</script>
```

### Authentication in HTML

```javascript
// Login
const { user, token } = await loginUser(
  'user@example.com',
  'password123'
);

// Token automatically stored in LocalStorage
// Use in all subsequent requests

// Get authenticated data
const bookings = await getUserBookings();

// Logout
logoutUser();
```

---

## ⚡ Performance Optimization

### Redis Caching

```
Request for vehicles
    ↓
Check Redis cache
    ↓
If found → Return cached data (fast!)
If not found → Query Supabase → Cache for 5 minutes
```

### Caching Strategy

| Data | TTL | When Invalidated |
|------|-----|------------------|
| Vehicle List | 5 min | Vehicle created/updated |
| Single Vehicle | 10 min | Vehicle updated |
| Analytics | 1 hour | Booking created/updated |
| User Bookings | Real-time | REALTIME channel |

---

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
```
✓ Check .env file has correct URL and keys
✓ Verify project is active on supabase.com
✓ Check internet connection
✓ Try: npx supabase projects list
```

### "WebSocket disconnected"
```
✓ Backend must be running (npm run server:dev)
✓ Check Port 5000 is not in use
✓ Verify no firewall blocks WebSocket
✓ Check browser console for errors
```

### "Redis connection failed"
```
✓ Verify REDIS_URL is correct in .env
✓ Create free Redis instance at redislabs.com
✓ Test URL with: npm install -g redis-cli
✓ redis-cli -u redis://your-url ping
```

### "401 Unauthorized"
```
✓ Token may be expired (24h limit)
✓ Logout and login again
✓ Check localStorage for token
✓ JWT_SECRET in .env must match backend
```

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `supabase-server.js` | Backend server (800 lines) |
| `supabase-client.js` | Frontend real-time client (400 lines) |
| `supabase-schema.sql` | Database schema (300 lines) |
| `.env` | Configuration (credentials) |
| `package.json` | Dependencies |

---

## 🎯 Next Steps

### Immediate (Today)
1. ✅ Run `npm install`
2. ✅ Run database schema in Supabase
3. ✅ Start backend: `npm run server:dev`
4. ✅ Start frontend: `npm run dev`
5. ✅ Test login and bookings

### Short-term (This Week)
1. Integrate payment processing (Stripe)
2. Add email notifications
3. Add SMS OTP verification
4. Deploy to production

### Medium-term (This Month)
1. Mobile app (React Native)
2. Advanced analytics dashboard
3. Machine learning for pricing
4. Admin mobile app

---

## 🚀 Production Deployment

### Before Going Live

```bash
✓ Environment variables set correctly
✓ Database backups configured
✓ HTTPS/SSL certificates ready
✓ CDN for static files
✓ Monitoring and alerts set up
✓ Error logging configured (e.g., Sentry)
✓ Load testing completed
✓ Security audit passed
```

### Deploy to Vercel/Netlify

```bash
# Frontend
npm run build
# Deploy dist/ folder

# Backend
npm install -g pm2
pm2 start supabase-server.js --name "vehicle-api"
pm2 save
```

---

## 📞 Support

### Documentation
- API Reference: [BACKEND_README.md](BACKEND_README.md)
- System Overview: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- Architecture: [FLOW_DIAGRAMS.md](FLOW_DIAGRAMS.md)

### External Resources
- Supabase Docs: https://supabase.com/docs
- Express.js: https://expressjs.com
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/docs/

---

## ✅ Checklist

Before submitting project:
- [ ] All dependencies installed
- [ ] Database schema created in Supabase
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] WebSocket real-time working
- [ ] User registration working
- [ ] User login working
- [ ] Vehicle browse working
- [ ] Booking creation working
- [ ] Admin dashboard working
- [ ] Redis cache working
- [ ] Error handling working
- [ ] All API endpoints tested
- [ ] Documentation complete
- [ ] Security measures in place

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: March 18, 2026
