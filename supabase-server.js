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
import nodemailer from 'nodemailer';

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

// Email Transporter (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify email setup on initialization
transporter.verify((error) => {
    if (error) {
        console.warn('⚠️  Email transporter verification failed:', error.message);
    } else {
        console.log('✅ Email transporter ready');
    }
});

// ==================== Middleware ====================

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
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

const getCache = async (key) => {
    if (!redisConnected || !redisClient) return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        return null;
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
        const { data: emailUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', username);

        if (emailUser && emailUser.length > 0) {
            user = emailUser[0];
        } else {
            // If not found by email, try username lookup
            const { data: usernameUser } = await supabaseAdmin
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

// Get all vehicles (with real-time cache and media join)
app.get('/api/vehicles', cacheMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabaseAdmin
            .from('vehicles')
            .select('*, vehicle_media(*)');

        if (status) {
            query = query.eq('status', status);
        }

        const { data: vehicles, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Cache for 5 minutes (conditionally based on status)
        const cacheKey = `GET:/api/vehicles:${status || 'all'}`;
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

// Get vehicle media
app.get('/api/vehicles/:id/media', async (req, res) => {
    try {
        const { data: media, error } = await supabaseAdmin
            .from('vehicle_media')
            .select('*')
            .eq('vehicle_id', req.params.id)
            .order('is_primary', { ascending: false });

        if (error) throw error;
        res.json(media);
    } catch (err) {
        console.error('Get vehicle media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add media to vehicle
app.post('/api/vehicles/:id/media', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can add media' });
    }

    try {
        const { media_type, url, is_primary } = req.body;
        const { data, error } = await supabaseAdmin
            .from('vehicle_media')
            .insert({
                vehicle_id: req.params.id,
                media_type: media_type || 'image',
                url,
                is_primary: is_primary || false
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Add media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete individual media
app.delete('/api/media/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete media' });
    }

    try {
        const { error } = await supabaseAdmin
            .from('vehicle_media')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Media deleted successfully' });
    } catch (err) {
        console.error('Delete media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update individual media (True Replace: preserves ID and position)
app.patch('/api/media/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update media' });
    }

    try {
        const { url, media_type } = req.body;
        const updateData = {};
        if (url) updateData.url = url;
        if (media_type) updateData.media_type = media_type;

        const { data, error } = await supabaseAdmin
            .from('vehicle_media')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Update media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Set media as primary for its vehicle
app.patch('/api/media/:id/primary', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can set primary' });
    }

    try {
        // 1. Get the media record to find the vehicle_id
        const { data: media, error: getError } = await supabaseAdmin
            .from('vehicle_media')
            .select('vehicle_id')
            .eq('id', req.params.id)
            .single();

        if (getError || !media) throw new Error('Media not found');

        // 2. Reset all other media for this vehicle
        await supabaseAdmin
            .from('vehicle_media')
            .update({ is_primary: false })
            .eq('vehicle_id', media.vehicle_id);

        // 3. Set the chosen one as primary
        const { data, error: updateError } = await supabaseAdmin
            .from('vehicle_media')
            .update({ is_primary: true })
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateError) throw updateError;
        res.json(data);
    } catch (err) {
        console.error('Set primary media error:', err);
        res.status(500).json({ error: err.message });
    }
});

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

// ==================== Public Booking Requests ====================

// Create booking request (Inquiry) from public form
app.post('/api/public/bookings', async (req, res) => {
    try {
        const { 
            customer_name, 
            customer_phone, 
            pickup_location, 
            destination, 
            purpose_of_trip, 
            visited_places, 
            start_date, 
            end_date,
            mode_of_transport,
            total_days
        } = req.body;

        const { data: request, error } = await supabaseAdmin
            .from('booking_requests')
            .insert({
                customer_name,
                customer_phone,
                pickup_location,
                destination,
                purpose_of_trip,
                visited_places,
                start_date,
                end_date: end_date || start_date, // Default to start_date if one-way
                mode_of_transport,
                total_days: total_days || 0,
                status: 'pending',
                created_at: new Date()
            })
            .select()
            .single();

        if (error) throw error;

        // Broadcast to admin dashboard
        broadcastUpdate('booking_requests', 'INSERT', request);

        // Send Email Notification to Admin (non-blocking)
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: 'mrcholidays73@gmail.com',
            subject: `📋 New Booking Request from ${customer_name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #3b82f6;">New Booking Inquiry</h2>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p><strong>Customer:</strong> ${customer_name}</p>
                    <p><strong>Phone:</strong> ${customer_phone}</p>
                    <p><strong>Pickup:</strong> ${pickup_location}</p>
                    <p><strong>Destination:</strong> ${destination}</p>
                    <p><strong>Vehicle:</strong> ${mode_of_transport}</p>
                    <p><strong>Travel Dates:</strong> ${start_date} ${end_date ? 'to ' + end_date : '(One-way)'}</p>
                    <p><strong>Purpose:</strong> ${purpose_of_trip}</p>
                    <p><strong>Visited Places:</strong> ${visited_places || 'Not specified'}</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 0.9em; color: #666;">This is an automated notification from <a href="https://teammrc.me">MRC Holidays</a>.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
                console.error('❌ Failed to send booking notification email:', mailErr.message);
                // We DON'T throw here, to ensure the user still gets a success response
            } else {
                console.log('✅ Booking notification email sent:', info.response);
            }
        });

        res.status(201).json({ message: 'Booking request submitted successfully', request });
    } catch (err) {
        console.error('Public booking request error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Admin Routes ====================

// Get all booking requests
app.get('/api/admin/booking-requests', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view requests' });
    }

    try {
        const { data: requests, error } = await supabaseAdmin
            .from('booking_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(requests);
    } catch (err) {
        console.error('Get booking requests error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all bookings (across all users)
app.get('/api/admin/all-bookings', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view all bookings' });
    }

    try {
        const { data: bookings, error } = await supabaseAdmin
            .from('bookings')
            .select('*, vehicles(*), users(name, email)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten for the dashboard
        const flattened = (bookings || []).map(b => ({
            ...b,
            vehicle_name: b.vehicles?.name,
            vehicle_type: b.vehicles?.type,
            user_name: b.users?.name,
            user_email: b.users?.email,
            is_inquiry: false
        }));

        // Also fetch pending inquiries to show in the unified list
        const { data: inquiries } = await supabaseAdmin
            .from('booking_requests')
            .select('*')
            .order('created_at', { ascending: false });

        const combined = [
            ...flattened,
            ...(inquiries || []).map(i => ({
                ...i,
                is_inquiry: true,
                vehicle_name: i.mode_of_transport ? (i.mode_of_transport + ' Request') : 'Inquiry',
                vehicle_type: i.mode_of_transport
            }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(combined);
    } catch (err) {
        console.error('Get all bookings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all users
app.get('/api/users', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view users' });
    }

    try {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name, username, phone, role, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Assign vehicle to booking request
app.post('/api/admin/booking-requests/:id/assign', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can assign vehicles' });
    }

    try {
        const { vehicleId, price } = req.body;
        const requestId = req.params.id;

        // 1. Get the request
        const { data: request, error: reqError } = await supabaseAdmin
            .from('booking_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError || !request) throw new Error('Request not found');

        // 2. Create a booking from the request
        const { data: booking, error: bookError } = await supabaseAdmin
            .from('bookings')
            .insert({
                user_id: req.user.id, // Use the ID of the admin who is assigning
                vehicle_id: vehicleId,
                start_date: request.start_date,
                end_date: request.end_date,
                total_cost: price || (request.total_days * 1000), 
                status: 'confirmed',
                special_notes: `Created from inquiry: ${request.pickup_location} to ${request.destination}`,
            })
            .select()
            .single();

        if (bookError) throw bookError;

        // 3. Update request status
        await supabaseAdmin
            .from('booking_requests')
            .update({ status: 'confirmed' })
            .eq('id', requestId);

        // 4. Update vehicle status
        await supabaseAdmin
            .from('vehicles')
            .update({ status: 'booked' })
            .eq('id', vehicleId);

        broadcastUpdate('booking_requests', 'UPDATE', { id: requestId, status: 'confirmed' });
        broadcastUpdate('vehicles', 'UPDATE', { id: vehicleId, status: 'booked' });

        res.json({ message: 'Vehicle assigned successfully', booking });
    } catch (err) {
        console.error('Assign vehicle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update booking request status (Confirm/Reject)
app.patch('/api/admin/booking-requests/:id/status', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update status' });
    }

    try {
        const { status } = req.body;
        const { data, error } = await supabaseAdmin
            .from('booking_requests')
            .update({ status })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        
        broadcastUpdate('booking_requests', 'UPDATE', data);
        res.json({ message: 'Status updated successfully', data });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mock Media Upload Route
// Admin file upload route (mapped from /api/admin/upload and /api/media/upload)
app.post(['/api/admin/upload', '/api/media/upload'], verifyToken, async (req, res) => {
    // Note: To handle real files, use multer. This is a mock returning a stable placeholder for testing.
    res.json({
        url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80',
        type: 'image',
        success: true
    });
});

// Get dashboard analytics
app.get('/api/admin/analytics', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const cacheKey = 'admin:analytics';
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    try {
        // Essential counts
        const { count: totalVehicles } = await supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true });
        
        // Detailed stats for charts and cards (with vehicle join)
        const { data: allBookings } = await supabaseAdmin.from('bookings').select('status, created_at, vehicles(type)');
        const { data: allRequests } = await supabaseAdmin.from('booking_requests').select('status, created_at, mode_of_transport');

        const monthlyStats = {};
        const yearlyStats = {};
        let confirmedCount = 0;
        let rejectedCount = 0;

        const getCategory = (type) => {
            const t = (type || '').toLowerCase();
            if (t.includes('bus')) return 'bus';
            if (t.includes('van')) return 'van';
            if (t.includes('car') || t.includes('sedan') || t.includes('suv') || t.includes('luxury')) return 'car';
            return 'car'; // Default
        };

        const processItems = (items, isBooking) => {
            items?.forEach(item => {
                const date = new Date(item.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const yearKey = `${date.getFullYear()}`;

                if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { confirmed: 0, rejected: 0, bus: 0, car: 0, van: 0 };
                if (!yearlyStats[yearKey]) yearlyStats[yearKey] = { confirmed: 0, rejected: 0, bus: 0, car: 0, van: 0 };

                const status = (item.status || '').toLowerCase();
                const category = getCategory(isBooking ? item.vehicles?.type : item.mode_of_transport);

                if (status === 'confirmed') {
                    monthlyStats[monthKey].confirmed++;
                    yearlyStats[yearKey].confirmed++;
                    monthlyStats[monthKey][category]++;
                    yearlyStats[yearKey][category]++;
                    confirmedCount++;
                } else if (status === 'cancelled' || status === 'rejected') {
                    monthlyStats[monthKey].rejected++;
                    yearlyStats[yearKey].rejected++;
                    rejectedCount++;
                }
            });
        };

        processItems(allBookings, true);
        processItems(allRequests, false);

        const analytics = {
            totalVehicles: totalVehicles || 0,
            totalBookings: confirmedCount,
            confirmedCount: confirmedCount,
            rejectedCount: rejectedCount,
            monthlyStats,
            yearlyStats,
            timestamp: new Date()
        };

        await setCache(cacheKey, analytics, 300);
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
