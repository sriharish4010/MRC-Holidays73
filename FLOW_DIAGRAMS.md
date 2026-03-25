# 🎯 System Flow Diagrams & Architecture Guide

## 1. User Registration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER SIGNUP FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

User Opens: user-signup.html
     │
     ▼
┌─────────────────────────────────────┐
│  STEP 1: Personal Information       │
│  ├─ Full Name                       │
│  ├─ Email                           │
│  ├─ Phone Number                    │
│  ├─ Date of Birth                   │
│  ├─ Address & City                  │
│  └─ Validation (Client-side)        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  STEP 2: Account Credentials        │
│  ├─ Username                        │
│  ├─ Password (strength meter)       │
│  ├─ Confirm Password                │
│  ├─ Driver's License                │
│  ├─ Terms & Privacy Acceptance      │
│  └─ Validation (Client-side)        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  STEP 3: Phone Verification         │
│  ├─ Send SMS with OTP Code          │
│  │  (Backend sends to phone)         │
│  ├─ User enters 6-digit code        │
│  ├─ 60-second countdown timer       │
│  ├─ Resend button (after 60s)       │
│  └─ Verification (Backend validates)│
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  USER CREATED SUCCESSFULLY!         │
│  ├─ User inserted in MySQL          │
│  ├─ Password hashed with bcryptjs   │
│  ├─ Email verified                  │
│  ├─ Phone verified                  │
│  └─ Redirect to login               │
└─────────────────────────────────────┘

Demo Mode: Use OTP "123456" for testing
```

## 2. User Login & Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                                      │
└─────────────────────────────────────────────────────────────────────┘

User Opens: user-login.html
     │
     ▼
┌──────────────────────────────────────┐
│  Option A: Email/Username Login      │
│  ├─ Enter username or email          │
│  ├─ Enter password                   │
│  └─ Click "Sign In"                  │
└────────────┬───────────────────────┬─┘
             │                       │
    Backend Verification        Password
    API Call                    Visibility
             │                   Toggle
             ▼
    ┌─────────────────────┐
    │ Valid Credentials?  │
    ├─ Query: SELECT user │
    │   WHERE username=.. │
    ├─ bcrypt.compare()   │
    │   password          │
    └──┬──────────┬───────┘
       │ YES      │ NO
       ▼          ▼
  ┌────────┐  ┌──────────────┐
  │ SUCCESS│  │ ERROR: 401   │
  └────┬───┘  │ Invalid cred │
       │      └──────────────┘
       ▼
┌──────────────────────────────────────┐
│  Generate JWT Token                  │
│  ├─ Payload: userId, email, role     │
│  ├─ Secret: JWT_SECRET from env      │
│  ├─ Expiration: 24 hours             │
│  └─ Return to client                 │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Client-side Storage                 │
│  ├─ Save token to localStorage       │
│  ├─ Save user info to localStorage   │
│  └─ Add to Authorization header      │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Redirect to Dashboard               │
│  ├─ Load user profile                │
│  ├─ Fetch vehicles from API          │
│  ├─ Fetch bookings                   │
│  └─ Display personalized dashboard   │
└──────────────────────────────────────┘


Option B: Forgot Password
     │
     ▼
Email → Verify Email → Send OTP → Verify OTP → Reset Password → Login
```

## 3. Booking Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BOOKING FLOW                                      │
└─────────────────────────────────────────────────────────────────────┘

User Logged In → user-dashboard.html
                 │
                 ▼
         Browse Vehicles
         GET /api/vehicles
                 │
                 ▼
      ┌──────────────────────┐
      │ Vehicle Card Display │
      │ ├─ Name              │
      │ ├─ Type              │
      │ ├─ Price ($50/day)   │
      │ ├─ Location          │
      │ ├─ Status: Available │
      │ └─ [BOOK NOW] Button │
      └──────────┬───────────┘
                 │
                 ▼ Click "Book Now"
         ┌───────────────────┐
         │ Select Dates      │
         ├─ Start Date       │
         ├─ End Date         │
         └─ [CONFIRM] Button │
         └───────┬───────────┘
                 │
                 ▼
    API Call: POST /api/bookings
    {
      "userId": 1,
      "vehicleId": 1,
      "startDate": "2026-03-20",
      "endDate": "2026-03-25"
    }
                 │
                 ▼
    ┌──────────────────────────────┐
    │ Backend Processing           │
    ├─ Check vehicle available?    │
    ├─ Calculate days: 5           │
    ├─ Total: 5 × $50 = $250       │
    ├─ Create booking record       │
    ├─ Update vehicle: available   │
    │  → booked                    │
    ├─ Cache invalidation          │
    └────┬──────────────────────────┘
         │ Success (201)
         │ or Error (400)
         ▼
    ┌──────────────────────────────┐
    │ Response to Client           │
    ├─ Booking ID: BK1234567890    │
    ├─ Total Amount: $250          │
    ├─ Status: Active              │
    └────┬──────────────────────────┘
         │
         ▼
    Show Success Alert
    Reload bookings list
    Update vehicle status

Database Updates:
├─ INSERT INTO bookings ...
├─ UPDATE vehicles SET status='booked' ...
├─ Cache: DEL vehicles:all
└─ Cache: User session update
```

## 4. Admin Dashboard Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN FLOW                                        │
└─────────────────────────────────────────────────────────────────────┘

Admin Opens: admin-login.html
     │ admin / password123
     ▼
┌────────────────────────────────────────┐
│ Admin Login (Same as user login)       │
│ ├─ Verify credentials                  │
│ ├─ Generate JWT (role: 'admin')        │
│ └─ Redirect to dashboard               │
└────────────┬──────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│  ADMIN DASHBOARD                       │
└────────────────────────────────────────┘
     │
     ├─► GET /api/admin/analytics
     │   ├─ Total vehicles: 45
     │   ├─ Available: 32
     │   ├─ Booked: 13
     │   ├─ Total customers: 128
     │   ├─ Active bookings: 18
     │   └─ Revenue this month: $5,240
     │
     ├─► SIDEBAR NAVIGATION
     │   ├─ Dashboard
     │   ├─ Vehicle Management
     │   │  ├─ GET /api/vehicles (List all)
     │   │  ├─ POST /api/vehicles (Add new)
     │   │  ├─ PATCH /api/vehicles/:id/status
     │   │  └─ DELETE vehicle
     │   │
     │   ├─ Booked Vehicles
     │   │  ├─ GET /api/bookings
     │   │  ├─ Filter by status
     │   │  └─ View booking details
     │   │
     │   ├─ Customers
     │   │  ├─ GET /api/customers
     │   │  ├─ View customer details
     │   │  ├─ Booking history
     │   │  └─ Customer stats
     │   │
     │   └─ Users (Admin Management)
     │      ├─ POST /api/users (Add admin)
     │      ├─ List all users
     │      ├─ Edit roles
     │      └─ Activate/Deactivate
     │
     └─► ACTIONS
         ├─ Add Vehicle
         │  └─ Name, Type, License Plate, Price, etc.
         │     → Database INSERT
         │     → Cache invalidate
         │     → Show success
         │
         ├─ Update Vehicle Status
         │  └─ Available → Booked → Maintenance
         │     → Database UPDATE
         │     → Real-time update to users
         │
         ├─ View/Cancel Booking
         │  └─ Update booking status
         │     → Release vehicle
         │     → Process refund
         │
         └─ Export Reports
            └─ CSV/PDF download
```

## 5. Data Flow: Frontend to Backend to Database

```
┌─────────────────────────────────────────────────────────────────────┐
│                  COMPLETE DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

FRONTEND (Browser)
│
├─ Collect User Input
│  └─ HTML Forms
│
├─ Client-side Validation
│  ├─ Email format
│  ├─ Phone format
│  ├─ Password strength
│  └─ Required fields
│
├─ Make API Request
│  ├─ Method: POST/GET/PATCH/DELETE
│  ├─ URL: http://localhost:5000/api/...
│  ├─ Headers: 
│  │  ├─ Content-Type: application/json
│  │  ├─ Authorization: Bearer {JWT_TOKEN}
│  │  └─ CORS: Allowed
│  └─ Body: JSON data
│
│                          │
│                HTTP Request
│                          │
│                          ▼
│
BACKEND (Node.js/Express - server.js)
│
├─ Receive Request
│  └─ Parse URL params, headers, body
│
├─ Middleware Processing
│  ├─ CORS check
│  ├─ Body parsing
│  ├─ JWT verification (if protected)
│  └─ Helmet security headers
│
├─ Route Processing
│  └─ Match URL to handler function
│
├─ Business Logic
│  ├─ Input validation (express-validator)
│  ├─ Data transformation
│  ├─ Authentication check
│  └─ Authorization check
│
├─ Database Operations
│  ├─ Query construction
│  ├─ Parameter binding (SQL injection prevention)
│  └─ Execute in connection pool
│
├─ Caching Logic
│  ├─ Check Redis first
│  ├─ If miss → query database
│  ├─ Store in Redis (TTL: 1h)
│  └─ Return cached result
│
├─ Response Handling
│  ├─ Format JSON response
│  ├─ Set HTTP status code
│  ├─ Add headers
│  └─ Send to client
│
│                          │
│                HTTP Response
│                          │
│                          ▼
│
FRONTEND (Browser)
│
├─ Receive Response
│  ├─ Status code: 200, 201, 400, 401, 500, etc.
│  └─ JSON body
│
├─ Handle Response
│  ├─ If success (2xx)
│  │  ├─ Update UI
│  │  ├─ Show success message
│  │  └─ Update localStorage if needed
│  │
│  └─ If error (4xx/5xx)
│     ├─ Show error message
│     ├─ Highlight form fields
│     └─ Log error details
│
├─ Update Display
│  ├─ Re-render components
│  ├─ Update tables/lists
│  └─ Refresh dashboards
│
└─ User Sees Updated Content

DATABASE FLOW:
┌──────────────────────────────────────────────────────────────┐
│                   MYSQL DATABASE                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  CRUD Operations:                                             │
│  ├─ CREATE (INSERT) - New vehicles, users, bookings          │
│  ├─ READ (SELECT) - Fetch data with filtering               │
│  ├─ UPDATE (UPDATE) - Modify vehicle status, user data       │
│  └─ DELETE (DELETE) - Soft delete with status flags         │
│                                                               │
│  Transaction Safety:                                          │
│  ├─ Atomic operations                                         │
│  ├─ ACID compliance                                           │
│  └─ Rollback on error                                         │
│                                                               │
│  For Performance:                                             │
│  ├─ Indexes on frequently queried columns                     │
│  ├─ Connection pooling (10 connections)                       │
│  └─ Parameterized queries (prevent SQL injection)            │
│                                                               │
└──────────────────────────────────────────────────────────────┘

REDIS CACHE FLOW:
┌──────────────────────────────────────────────────────────────┐
│                    REDIS CACHE                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  When request arrives:                                        │
│  ├─ Check Redis for key: vehicles:all                         │
│  ├─ If found → Return from cache (fast!)                      │
│  ├─ If miss → Query MySQL                                     │
│  │            → Store in Redis                                │
│  │            → TTL: 1 hour                                   │
│  │            → Return to client                              │
│  └─ Cache invalidation when data changes                      │
│                                                               │
│  Keys stored:                                                 │
│  ├─ vehicles:all (vehicle listings)                           │
│  ├─ vehicle:{id} (individual vehicle)                         │
│  ├─ user:{userId} (user session)                              │
│  └─ bookings:user:{userId} (user bookings)                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 6. Security Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY FLOW                                     │
└─────────────────────────────────────────────────────────────────────┘

USER PASSWORD
     │
     ▼
┌─────────────────────────────────────┐
│  Password Validation (Frontend)     │
├─ Min 8 characters                  │
├─ Uppercase letter required         │
├─ Number required                   │
├─ Special character (optional)      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Hash Password (Backend)            │
├─ bcryptjs library                  │
├─ Salt rounds: 10                   │
├─ Algorithm: bcrypt                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Store in Database                  │
├─ Store HASH only (not plain text)  │
├─ Original password is forgotten    │
└──────────┬──────────────────────────┘
           │
LOGIN TIME
           │
           ▼
┌─────────────────────────────────────┐
│  User enters password               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  bcrypt.compare()                   │
├─ Compare plain text with hash      │
├─ Impossible to crack hash          │
├─ Return true/false                 │
└──────────┬──────────────────────────┘
           │
       YES │ NO
           ▼ ▼
      ┌────────┐ ┌──────────┐
      │ SUCCESS│ │ REJECTED │
      └────┬───┘ └──────────┘
           │
           ▼
    Generate JWT Token
    ├─ Header.Payload.Signature
    ├─ Payload contains: userId, email, role
    ├─ Secret: JWT_SECRET (keep safe!)
    ├─ Expires: 24 hours
    └─ Return to client

JWT USAGE:
├─ Store in localStorage (browser)
├─ Send in Authorization header: "Bearer {token}"
├─ Verify on each API request
├─ Check expiration time
└─ Return 401 if invalid/expired

PROTECTED ROUTES:
├─ Require valid JWT token
├─ Decode token to get userId
├─ Check user role (user/admin/manager)
├─ Allow/deny based on permissions
└─ Example: Only admins can DELETE vehicle

CORS SECURITY:
├─ Whitelist allowed origins
├─ Only localhost:5173 (dev)
├─ Production: your domain
└─ Prevent cross-site attacks

HTTPS (Production):
├─ Encrypt all traffic
├─ Use SSL certificate
├─ Redirect HTTP → HTTPS
└─ Protect JWT transmission

INPUT VALIDATION:
├─ Sanitize all inputs
├─ Check data types
├─ Validate email/phone formats
├─ Prevent SQL injection (parameterized queries)
└─ Prevent XSS attacks (escape output)
```

## 7. Real-time Updates with Redis

```
┌─────────────────────────────────────────────────────────────────────┐
│                  REAL-TIME UPDATES FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

Event: Admin adds new vehicle
     │
     ▼
Database: INSERT INTO vehicles ...
     │
     ▼
Cache Invalidation: DEL vehicles:all
     │
     ▼
Notify Connected Clients: (WebSocket - optional)
     │
     ▼
Next User requests /api/vehicles
     │
     ▼
Backend: Cache miss (just cleared)
     │
     ▼
Query Fresh Data from MySQL
     │
     ▼
Store in Redis (TTL 1 hour)
     │
     ▼
Return to User (includes new vehicle!)

CACHING STRATEGY:
├─ Cold Cache (miss) → Query DB → Store in Redis → Return
├─ Warm Cache (hit) → Return from Redis (fast!)
├─ Update Event → Invalidate cache → Next request gets fresh data
└─ TTL Expiry → Auto-remove old cache → Forces fresh data fetch

REAL-TIME FEATURES:
├─ Vehicle availability updates immediately
├─ Booking status changes reflect instantly
├─ User counts update in admin dashboard
├─ Reduced database load
├─ Faster response times
└─ Better user experience
```

## 8. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

API Request
     │
     ▼
┌──────────────────────────┐
│ Try Block                │
├─ Execute business logic  │
└──────┬───────────────────┘
       │
       ├─► Success → Return 200
       │
       └─► Error occurs
           │
           ▼
       ┌───────────────────────────┐
       │ Catch Block               │
       ├─ Log error details        │
       ├─ Identify error type      │
       └──────┬────────────────────┘
              │
              ├─► Validation Error
              │   └─ Return 400 Bad Request
              │      {"message": "Invalid email"}
              │
              ├─► Authentication Error
              │   └─ Return 401 Unauthorized
              │      {"message": "Invalid credentials"}
              │
              ├─► Authorization Error
              │   └─ Return 403 Forbidden
              │      {"message": "Admin access required"}
              │
              ├─► Not Found Error
              │   └─ Return 404 Not Found
              │      {"message": "Vehicle not found"}
              │
              ├─► Conflict Error
              │   └─ Return 409 Conflict
              │      {"message": "Email already exists"}
              │
              └─► Server Error
                  └─ Return 500 Internal Server Error
                     {"message": "Database connection failed"}

FRONTEND ERROR HANDLING:
├─ Catch HTTP errors
├─ Display user-friendly message
├─ Log to console for debugging
├─ Suggest corrective action
└─ Optionally retry failed request

LOGGING:
├─ Request: [timestamp] METHOD /path
├─ Error: [timestamp] Error message + stack trace
├─ Database: [timestamp] Query + affected rows
└─ File: logs/app.log
```

---

These diagrams show exactly how data flows through your system from user interaction all the way to the database and back!

