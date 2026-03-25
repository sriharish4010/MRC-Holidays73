# 🚗 Vehicle Rental Management System - Backend API

Complete REST API backend for a vehicle rental platform with user authentication, vehicle management, booking system, real-time caching with Redis, and MySQL database.

## 🏗️ Architecture

```
User (Browser - Frontend)
      ↓
Frontend (HTML, CSS, JavaScript)
      ↓
API Gateway (Node.js/Express)
      ↓
┌─────────────────┬──────────────┐
│   MySQL DB      │   Redis      │
│  (Data Store)   │  (Cache+RT)  │
└─────────────────┴──────────────┘
```

## 📋 Features

- ✅ **User Authentication** - Registration, Login, JWT tokens
- ✅ **Vehicle Management** - Add, update, track availability
- ✅ **Booking System** - Create, manage, cancel bookings
- ✅ **Admin Dashboard** - Analytics, reports, user management
- ✅ **Real-time Data** - Redis caching for performance
- ✅ **SMS Verification** - OTP verification for phone numbers
- ✅ **Payment Integration** - Ready for Stripe/PayPal
- ✅ **Audit Logging** - Track all admin actions
- ✅ **Role-based Access** - Admin, Manager, User roles

## 🚀 Quick Start

### Prerequisites
- Node.js v14+
- MySQL v5.7+
- Redis v6+

### Installation

1. **Clone repository**
```bash
cd d:\team mrc
npm install
```

2. **Setup Database**
```bash
# Create database and tables
mysql -u root -p < database_schema.sql

# Or import via MySQL Workbench
```

3. **Configure Environment**
```bash
# Edit .env file with your settings
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vehicle_rental
REDIS_HOST=localhost
JWT_SECRET=your-secret-key
```

4. **Start Server**
```bash
# Development
npm run dev

# Production
npm start
```

Server will start on `http://localhost:5000`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1 (555) 123-4567",
  "dateOfBirth": "1990-01-15",
  "address": "123 Main St",
  "city": "New York",
  "username": "johndoe",
  "password": "SecurePass123!",
  "licenseNumber": "DL12345678"
}
```

**Response (201)**
```json
{
  "message": "User registered successfully",
  "userId": 1,
  "user": {
    "id": 1,
    "email": "john@example.com",
    "username": "johndoe"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response (200)**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "username": "johndoe",
    "role": "user"
  }
}
```

### Vehicle Endpoints

#### Get All Vehicles
```http
GET /api/vehicles
```

**Response (200)**
```json
[
  {
    "id": 1,
    "vehicle_id": "V001",
    "name": "Toyota Camry",
    "type": "Sedan",
    "license_plate": "ABC1234",
    "daily_rate": 50.00,
    "location": "Lot A",
    "seating_capacity": 5,
    "fuel_type": "Petrol",
    "status": "available",
    "created_at": "2026-03-18T10:30:00Z"
  }
]
```

#### Get Vehicle by ID
```http
GET /api/vehicles/:id
```

#### Create Vehicle (Admin Only)
```http
POST /api/vehicles
Authorization: Bearer {token}
Content-Type: application/json

{
  "vehicleId": "V006",
  "name": "BMW X5",
  "type": "SUV",
  "licensePlate": "BXM1234",
  "dailyRate": 90.00,
  "location": "Lot E",
  "seatingCapacity": 7,
  "fuelType": "Petrol"
}
```

#### Update Vehicle Status
```http
PATCH /api/vehicles/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "maintenance"
}
```

**Valid statuses:** `available`, `booked`, `maintenance`, `deleted`

### Booking Endpoints

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": 1,
  "vehicleId": 1,
  "startDate": "2026-03-20",
  "endDate": "2026-03-25"
}
```

**Response (201)**
```json
{
  "message": "Booking created successfully",
  "bookingId": 101,
  "totalAmount": 250.00,
  "days": 5
}
```

#### Get All Bookings
```http
GET /api/bookings
Authorization: Bearer {token}
```

#### Get User's Bookings
```http
GET /api/bookings?userId=1
Authorization: Bearer {token}
```

#### Cancel Booking
```http
PATCH /api/bookings/:id/cancel
Authorization: Bearer {token}
```

### Customer Endpoints

#### Get All Customers
```http
GET /api/customers
Authorization: Bearer {token}
```

**Response (200)**
```json
[
  {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "driver_license": "DL12345678",
    "address": "123 Main St",
    "city": "New York",
    "total_bookings": 5,
    "created_at": "2026-01-15T08:00:00Z"
  }
]
```

### Admin Endpoints

#### Get Dashboard Analytics
```http
GET /api/admin/analytics
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "vehicles": {
    "total": 45,
    "available": 32,
    "booked": 13
  },
  "bookings": {
    "total": 18
  },
  "customers": {
    "total": 128
  },
  "revenue": {
    "total": "5240.00"
  }
}
```

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer {token}
```

Tokens expire in 24 hours. Use the login endpoint to get a new token.

## 🗄️ Database Schema

### Users Table
- id, username, email, password_hash
- full_name, phone, driver_license
- address, city, date_of_birth
- role (user/admin/manager), status
- timestamps

### Vehicles Table
- id, vehicle_id, name, type
- license_plate, daily_rate
- location, seating_capacity, fuel_type
- transmission, color, year, mileage
- status, timestamps

### Bookings Table
- id, booking_id, user_id, vehicle_id
- start_date, end_date
- pickup_location, return_location
- total_amount, status, payment_status
- notes, timestamps

### Additional Tables
- payments, reviews, sms_verification, audit_log

## ⚡ Caching Strategy

Redis is used for:
- **Session Management** - User login sessions
- **Vehicle Listings** - Cache all vehicles (1 hour TTL)
- **Booking Data** - Recent bookings cache
- **Real-time Updates** - WebSocket support (optional)

Cache keys:
- `vehicles:all` - All available vehicles
- `vehicle:{id}` - Individual vehicle
- `user:{userId}` - User session data
- `bookings:user:{userId}` - User's bookings

## 🛡️ Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Helmet.js headers
- ✅ Input validation & sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (optional)
- ✅ HTTPS ready
- ✅ Environment variables for secrets

## 📊 Error Handling

All errors return consistent format:

```json
{
  "message": "Error message",
  "error": "Detailed error (dev only)"
}
```

**Status Codes:**
- 200 - Success
- 201 - Created
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 409 - Conflict
- 500 - Server Error

## 🧪 Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Production Checklist
- [ ] Change JWT_SECRET to strong random value
- [ ] Enable HTTPS
- [ ] Configure MySQL backups
- [ ] Setup Redis persistence
- [ ] Enable rate limiting
- [ ] Setup error logging (Sentry, Rollbar)
- [ ] Enable API monitoring
- [ ] Configure CORS properly
- [ ] Setup CI/CD pipeline
- [ ] Configure environment variables safely

### Docker Deployment (Optional)
```bash
docker-compose up -d
```

## 📝 Frontend Integration

Frontend should:
1. Send login credentials to `/api/auth/login`
2. Store received JWT token in localStorage
3. Send token in Authorization header for all requests
4. Redirect to login if token expires (401)
5. Cache vehicle data locally after fetching

Example:
```javascript
// Fetch vehicles
const response = await fetch('http://localhost:5000/api/vehicles');
const vehicles = await response.json();

// Create booking with auth
const booking = await fetch('http://localhost:5000/api/bookings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 1,
    vehicleId: 1,
    startDate: '2026-03-20',
    endDate: '2026-03-25'
  })
});
```

## 🐛 Troubleshooting

### MySQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
- Check MySQL is running: `mysql -u root -p`
- Verify DB credentials in .env
- Ensure database `vehicle_rental` exists

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
- Start Redis: `redis-server`
- Verify Redis host/port in .env
- Check Redis is accessible: `redis-cli ping`

### Token Expired
- Request new token via login endpoint
- Update localStorage with new token
- Retry original request

## 📞 Support

For issues, create an issue in the repository or contact the development team.

## 📄 License

MIT License - See LICENSE file

---

**Happy Renting! 🚗**
