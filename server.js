require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const redis = require('redis');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'vehicle_rental',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Redis Client
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
});

redisClient.connect().catch((err) => {
    console.error('Redis connection error:', err);
});

redisClient.on('error', (err) => console.error('Redis error:', err));

// Make pool and redis available to routes
app.locals.pool = pool;
app.locals.redisClient = redisClient;

// ==================== ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== AUTH ROUTES ====================

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, email, phone, dateOfBirth, address, city, username, password, licenseNumber } = req.body;

        // Validate input
        if (!fullName || !email || !phone || !username || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const connection = await pool.getConnection();

        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username],
        );

        if (existingUser.length > 0) {
            connection.release();
            return res.status(409).json({ message: 'User already exists' });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await connection.execute(
            `INSERT INTO users (full_name, email, phone, username, password_hash, driver_license, address, city, date_of_birth, role, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'active', NOW())`,
            [fullName, email, phone, username, hashedPassword, licenseNumber, address, city, dateOfBirth],
        );

        connection.release();

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId,
            user: { id: result.insertId, email, username },
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }

        const connection = await pool.getConnection();

        // Get user
        const [users] = await connection.execute(
            'SELECT id, email, username, password_hash, role FROM users WHERE (username = ? OR email = ?) AND status = "active"',
            [username, username]
        );

        if (users.length === 0) {
            connection.release();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const bcrypt = require('bcryptjs');
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            connection.release();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Cache user session in Redis
        await redisClient.setEx(
            `user:${user.id}`,
            86400,
            JSON.stringify({ id: user.id, email: user.email, role: user.role })
        );

        connection.release();

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, username: user.username, role: user.role }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== VEHICLE ROUTES ====================

// Get All Vehicles
app.get('/api/vehicles', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // Try cache first
        const cacheKey = 'vehicles:all';
        const cachedVehicles = await redisClient.get(cacheKey);

        if (cachedVehicles) {
            connection.release();
            return res.json(JSON.parse(cachedVehicles));
        }

        const [vehicles] = await connection.execute(
            `SELECT id, vehicle_id, name, type, license_plate, daily_rate, location, 
                    seating_capacity, fuel_type, status, created_at FROM vehicles WHERE status != 'deleted'`
        );

        // Cache for 1 hour
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(vehicles));

        connection.release();

        res.json(vehicles);

    } catch (error) {
        console.error('Get vehicles error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Vehicle by ID
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();

        const [vehicles] = await connection.execute(
            'SELECT * FROM vehicles WHERE id = ? AND status != "deleted"',
            [id]
        );

        if (vehicles.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        connection.release();
        res.json(vehicles[0]);

    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create Vehicle (Admin Only)
app.post('/api/vehicles', async (req, res) => {
    try {
        const { vehicleId, name, type, licensePlate, dailyRate, location, seatingCapacity, fuelType } = req.body;

        if (!name || !type || !licensePlate || !dailyRate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            `INSERT INTO vehicles (vehicle_id, name, type, license_plate, daily_rate, location, seating_capacity, fuel_type, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', NOW())`,
            [vehicleId, name, type, licensePlate, dailyRate, location, seatingCapacity, fuelType]
        );

        // Invalidate cache
        await redisClient.del('vehicles:all');

        connection.release();

        res.status(201).json({
            message: 'Vehicle created successfully',
            vehicleId: result.insertId
        });

    } catch (error) {
        console.error('Create vehicle error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update Vehicle Availability
app.patch('/api/vehicles/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['available', 'booked', 'maintenance', 'deleted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const connection = await pool.getConnection();

        await connection.execute(
            'UPDATE vehicles SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        // Invalidate cache
        await redisClient.del('vehicles:all');
        await redisClient.del(`vehicle:${id}`);

        connection.release();

        res.json({ message: 'Vehicle status updated successfully' });

    } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== BOOKING ROUTES ====================

// Create Booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, vehicleId, startDate, endDate } = req.body;

        if (!userId || !vehicleId || !startDate || !endDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const connection = await pool.getConnection();

        // Check vehicle availability
        const [vehicles] = await connection.execute(
            'SELECT * FROM vehicles WHERE id = ? AND status = "available"',
            [vehicleId]
        );

        if (vehicles.length === 0) {
            connection.release();
            return res.status(400).json({ message: 'Vehicle not available' });
        }

        const vehicle = vehicles[0];

        // Calculate days and total amount
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const totalAmount = days * vehicle.daily_rate;

        // Create booking
        const [result] = await connection.execute(
            `INSERT INTO bookings (booking_id, user_id, vehicle_id, start_date, end_date, total_amount, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
            [`BK${Date.now()}`, userId, vehicleId, startDate, endDate, totalAmount]
        );

        // Update vehicle status
        await connection.execute(
            'UPDATE vehicles SET status = "booked" WHERE id = ?',
            [vehicleId]
        );

        // Invalidate cache
        await redisClient.del('vehicles:all');
        await redisClient.del(`vehicle:${vehicleId}`);

        connection.release();

        res.status(201).json({
            message: 'Booking created successfully',
            bookingId: result.insertId,
            totalAmount,
            days
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const { userId } = req.query;
        const connection = await pool.getConnection();

        let query = `SELECT b.*, v.name as vehicle_name, u.full_name as user_name
                     FROM bookings b
                     JOIN vehicles v ON b.vehicle_id = v.id
                     JOIN users u ON b.user_id = u.id
                     WHERE b.status != 'deleted'`;
        let params = [];

        if (userId) {
            query += ' AND b.user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY b.created_at DESC';

        const [bookings] = await connection.execute(query, params);
        connection.release();

        res.json(bookings);

    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Cancel Booking
app.patch('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();

        // Get booking
        const [bookings] = await connection.execute(
            'SELECT vehicle_id FROM bookings WHERE id = ?',
            [id]
        );

        if (bookings.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Update booking status
        await connection.execute(
            'UPDATE bookings SET status = "cancelled" WHERE id = ?',
            [id]
        );

        // Release vehicle
        await connection.execute(
            'UPDATE vehicles SET status = "available" WHERE id = ?',
            [bookings[0].vehicle_id]
        );

        // Invalidate cache
        await redisClient.del('vehicles:all');

        connection.release();

        res.json({ message: 'Booking cancelled successfully' });

    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== CUSTOMER ROUTES ====================

// Get All Customers
app.get('/api/customers', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [customers] = await connection.execute(
            `SELECT id, full_name, email, phone, driver_license, address, city, created_at,
                    (SELECT COUNT(*) FROM bookings WHERE user_id = users.id) as total_bookings
             FROM users WHERE role = 'user' AND status != 'deleted'`
        );

        connection.release();

        res.json(customers);

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ADMIN ROUTES ====================

// Get Dashboard Analytics
app.get('/api/admin/analytics', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [vehicleStats] = await connection.execute(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) as booked
             FROM vehicles WHERE status != 'deleted'`
        );

        const [bookingStats] = await connection.execute(
            `SELECT COUNT(*) as total FROM bookings WHERE status = 'active'`
        );

        const [customerStats] = await connection.execute(
            `SELECT COUNT(*) as total FROM users WHERE role = 'user'`
        );

        const [revenue] = await connection.execute(
            `SELECT SUM(total_amount) as total FROM bookings WHERE status IN ('active', 'completed')`
        );

        connection.release();

        res.json({
            vehicles: vehicleStats[0],
            bookings: bookingStats[0],
            customers: customerStats[0],
            revenue: revenue[0]
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚗 Vehicle Rental API running on http://localhost:${PORT}`);
    console.log(`📊 API Documentation: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
