import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import redis from 'redis';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

dotenv.config();

// ==================== Initialization ====================

const app = express();
const httpServer = createServer(app);

// Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
);

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

// Redis Client (Optional)
let redisClient = null;
let redisConnected = false;

if (process.env.REDIS_URL) {
    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            socket: { reconnectStrategy: (retries) => retries > 3 ? new Error('Redis unavailable') : Math.min(retries * 50, 500) },
        });
        redisClient.on('error', (err) => {
            if (/ECONNREFUSED|timeout/.test(err.message)) {
                redisConnected = false; // Silent fail for connection errors
            } else {
                console.warn('Redis error:', err.message);
            }
        });
        redisClient.on('connect', () => {
            redisConnected = true;
            console.log('✅ Redis connected');
        });
        // Don't await - let server start independently
        redisClient.connect().catch(() => {
            redisConnected = false;
            console.log('⚠️  Redis unavailable - caching disabled');
        });
    } catch (err) {
        console.warn('Redis client setup failed, continuing without cache');
    }
}

// WebSocket Server (Real-time)
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();

// ==================== Middleware ====================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Verification Middleware
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Cache Middleware
const cacheMiddleware = async (req, res, next) => {
    if (!redisConnected || !redisClient) {
        return next();
    }
    
    const cacheKey = `${req.method}:${req.path}`;
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached && req.method === 'GET') {
            return res.json(JSON.parse(cached));
        }
    } catch (err) {
        console.warn('Cache retrieval failed:', err.message);
    }
    next();
};

// Helper: Safe Redis Cache
const setCache = async (key, value, ttl = 300) => {
    if (!redisConnected || !redisClient) return;
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (err) {
        console.warn('Cache set failed:', err.message);
    }
};

// ==================== WebSocket Real-time Updates ====================

wss.on('connection', (ws) => {
    console.log('✅ Client connected to WebSocket');
    clients.add(ws);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'subscribe') {
                ws.subscriptionType = data.table;
                console.log(`📡 Client subscribed to: ${data.table}`);
            }
        } catch (err) {
            console.error('WebSocket message error:', err);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('❌ Client disconnected');
    });
});

// Broadcast real-time updates to all connected clients
const broadcastUpdate = (table, action, data) => {
    const update = { table, action, data, timestamp: new Date() };

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            if (!client.subscriptionType || client.subscriptionType === table) {
                client.send(JSON.stringify(update));
            }
        }
    });
};

// ==================== Authentication Routes ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    const { email, password, phone, name, username } = req.body;

    try {
    // Validate input
        if (!email || !password || !phone || !name || !username) {
            return res.status(400).json({ error: 'All fields required' });
        }

        // Check if email exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingEmail) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Check if username exists
        const { data: existingUsername } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (existingUsername) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Create user in Supabase
        const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert({
                email,
                username,
                password_hash: hashedPassword,
                phone,
                name,
                role: 'user',
                created_at: new Date(),
            })
            .select()
            .single();

        if (error) throw error;

        // Generate JWT
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION },
        );

        // Broadcast to WebSocket clients
        broadcastUpdate('users', 'INSERT', { id: newUser.id, email });

        res.status(201).json({ user: newUser, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username/email and password required' });
        }

        let user = null;

        // Try email lookup first (since most accounts were created with email)
        const { data: emailUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', username);

        if (emailUser && emailUser.length > 0) {
            user = emailUser[0];
        } else {
            // If not found by email, try username lookup
            const { data: usernameUser } = await supabase
                .from('users')
                .select('*')
                .eq('username', username);

            if (usernameUser && usernameUser.length > 0) {
                user = usernameUser[0];
            }
        }

        // No user found
        if (!user) {
            console.log(`Login attempt failed: No user found for ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const passwordMatch = await bcryptjs.compare(password, user.password_hash);
        if (!passwordMatch) {
            console.log(`Login attempt failed: Wrong password for ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION },
        );

        // Cache user token
        await setCache(`token:${user.id}`, token, 86400);

        res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
        );

        // Store reset token in Redis
        await setCache(`reset:${user.id}`, resetToken, 3600);

        // TODO: Send email with reset link
        console.log(`Reset token for ${email} (demo): ${resetToken}`);

        res.json({ message: 'Reset link sent to email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Vehicle Routes ====================

// Get all vehicles (with real-time cache)
app.get('/api/vehicles', cacheMiddleware, async (req, res) => {
    try {
        const { data: vehicles, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('status', 'available');

        if (error) throw error;

        // Cache for 5 minutes
        const cacheKey = `GET:/api/vehicles`;
        await setCache(cacheKey, vehicles, 300);

        res.json(vehicles);
    } catch (err) {
        console.error('Get vehicles error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get vehicle by ID
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const { data: vehicle, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        // Cache for 10 minutes
        await setCache(`vehicle:${req.params.id}`, vehicle, 600);

        res.json(vehicle);
    } catch (err) {
        console.error('Get vehicle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create vehicle (admin only)
app.post('/api/vehicles', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can create vehicles' });
    }

    try {
        const { name, type, license_plate, daily_rate, location, capacity, fuel_type } = req.body;

        const { data: vehicle, error } = await supabaseAdmin
            .from('vehicles')
            .insert({
                name,
                type,
                license_plate,
                daily_rate,
                location,
                capacity,
                fuel_type,
                status: 'available',
                created_at: new Date(),
            })
            .select()
            .single();

        if (error) throw error;

        // Invalidate cache
        await redisClient.del('GET:/api/vehicles');

        // Broadcast real-time update
        broadcastUpdate('vehicles', 'INSERT', vehicle);

        res.status(201).json(vehicle);
    } catch (err) {
        console.error('Create vehicle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update vehicle status
app.patch('/api/vehicles/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;

        const { data: vehicle, error } = await supabaseAdmin
            .from('vehicles')
            .update({ status, updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Invalidate cache
        await redisClient.del('GET:/api/vehicles');
        await redisClient.del(`vehicle:${req.params.id}`);

        // Broadcast real-time update
        broadcastUpdate('vehicles', 'UPDATE', vehicle);

        res.json(vehicle);
    } catch (err) {
        console.error('Update vehicle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Booking Routes ====================

// Create booking
app.post('/api/bookings', verifyToken, async (req, res) => {
    try {
        const { vehicle_id, start_date, end_date } = req.body;

        // Get vehicle details
        const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', vehicle_id)
            .single();

        if (vehicleError || !vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Check availability
        const { data: conflicts } = await supabase
            .from('bookings')
            .select('*')
            .eq('vehicle_id', vehicle_id)
            .in('status', ['confirmed', 'pending']);

        const hasConflict = conflicts?.some((booking) => {
            const bStart = new Date(booking.start_date);
            const bEnd = new Date(booking.end_date);
            const reqStart = new Date(start_date);
            const reqEnd = new Date(end_date);
            return reqStart < bEnd && reqEnd > bStart;
        });

        if (hasConflict) {
            return res.status(409).json({ error: 'Vehicle not available for these dates' });
        }

        // Calculate total cost
        const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24));
        const total_cost = days * vehicle.daily_rate;

        // Create booking
        const { data: booking, error } = await supabaseAdmin
            .from('bookings')
            .insert({
                user_id: req.user.id,
                vehicle_id,
                start_date,
                end_date,
                total_cost,
                status: 'confirmed',
                created_at: new Date(),
            })
            .select()
            .single();

        if (error) throw error;

        // Update vehicle status to booked
        await supabaseAdmin
            .from('vehicles')
            .update({ status: 'booked' })
            .eq('id', vehicle_id);

        // Invalidate cache
        await redisClient.del('GET:/api/vehicles');

        // Broadcast real-time update
        broadcastUpdate('bookings', 'INSERT', booking);
        broadcastUpdate('vehicles', 'UPDATE', { id: vehicle_id, status: 'booked' });

        res.status(201).json(booking);
    } catch (err) {
        console.error('Create booking error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user bookings
app.get('/api/bookings', verifyToken, async (req, res) => {
    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, vehicles(*)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(bookings);
    } catch (err) {
        console.error('Get bookings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Cancel booking
app.patch('/api/bookings/:id/cancel', verifyToken, async (req, res) => {
    try {
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Update booking status
        const { data: updatedBooking, error } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled', updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Release vehicle
        await supabaseAdmin
            .from('vehicles')
            .update({ status: 'available' })
            .eq('id', booking.vehicle_id);

        // Invalidate cache
        await redisClient.del('GET:/api/vehicles');

        // Broadcast real-time update
        broadcastUpdate('bookings', 'UPDATE', { id: req.params.id, status: 'cancelled' });
        broadcastUpdate('vehicles', 'UPDATE', { id: booking.vehicle_id, status: 'available' });

        res.json(updatedBooking);
    } catch (err) {
        console.error('Cancel booking error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== User Profile Routes ====================

// Get user profile
app.get('/api/users/:id', verifyToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, phone, role, created_at')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update user profile
app.put('/api/users/:id', verifyToken, async (req, res) => {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const { name, phone } = req.body;

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({ name, phone, updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Broadcast real-time update
        broadcastUpdate('users', 'UPDATE', user);

        res.json(user);
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Analytics Routes ====================

// Get dashboard analytics
app.get('/api/admin/analytics', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view analytics' });
    }

    try {
        const cacheKey = 'analytics:dashboard';
        const cached = await redisClient.get(cacheKey);

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        // Get totals
        const { count: totalVehicles } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true });

        const { count: totalBookings } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });

        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        const { data: bookingStats } = await supabase
            .from('bookings')
            .select('total_cost')
            .eq('status', 'confirmed');

        const totalRevenue = bookingStats?.reduce((sum, b) => sum + b.total_cost, 0) || 0;

        const analytics = {
            totalVehicles,
            totalBookings,
            totalUsers,
            totalRevenue,
            timestamp: new Date(),
        };

        // Cache for 1 hour
        await setCache(cacheKey, analytics, 3600);

        res.json(analytics);
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Health Check ====================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== Error Handling ====================

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== Server Start ====================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`
  ╔════════════════════════════════════════╗
  ║   🚀 Vehicle Rental API Server         ║
  ║   ✅ Supabase + Real-time Updates      ║
  ║   📡 WebSocket Connected               ║
  ║   💾 Redis Cache Active                ║
  ║                                        ║
  ║   Server: http://localhost:${PORT}     ║
  ║   API: http://localhost:${PORT}/api    ║
  ║   WebSocket: ws://localhost:${PORT}    ║
  ╚════════════════════════════════════════╝
  `);
});

export default app;
