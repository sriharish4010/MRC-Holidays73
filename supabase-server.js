import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import nodemailer from 'nodemailer';
import multer from 'multer';
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

// Multer Setup for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

        console.log('🔍 Authenticating user:', username);

        let user = null;

        // Try username lookup first
        const { data: usernameUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('username', username);

        if (usernameUser && usernameUser.length > 0) {
            user = usernameUser[0];
        } else {
            // If not found by username, try email
            const { data: emailUser } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('email', username);
            if (emailUser && emailUser.length > 0) user = emailUser[0];
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
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '24h' },
        );

        // Cache user token (optional)
        if (redisConnected) {
            await setCache(`token:${user.id}`, token, 86400);
        }

        res.json({ 
            user: { id: user.id, username: user.username, name: user.name, role: user.role }, 
            token 
        });
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
        const { data: vehicles, error: vError } = await supabase
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });

        if (vError) throw vError;

        const { data: mData, error: mError } = await supabaseAdmin
            .from('vehicle_media')
            .select('*');

        let media = [];
        if (!mError) {
            media = mData || [];
            console.log(`Successfully fetched ${media.length} media items from table`);
        } else if (mError.code === 'PGRST205') {
            console.warn('vehicle_media table missing, falling back to features.media');
        } else {
            throw mError;
        }

        const vehiclesWithMedia = vehicles.map(v => ({
            ...v,
            vehicle_media: (media.length > 0) 
                ? media.filter(m => m.vehicle_id === v.id)
                : (v.features?.media || [])
        }));

        // Cache for 5 minutes
        const cacheKey = `GET:/api/vehicles`;
        await setCache(cacheKey, vehiclesWithMedia, 300);

        res.json(vehiclesWithMedia);
    } catch (err) {
        console.error('Get vehicles error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get vehicle by ID
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const { data: vehicle, error: vError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (vError) throw vError;

        const { data: mData, error: mError } = await supabaseAdmin
            .from('vehicle_media')
            .select('*')
            .eq('vehicle_id', req.params.id);

        let media = [];
        if (!mError) {
            media = mData || [];
        } else if (mError.code === 'PGRST205') {
            media = vehicle.features?.media || [];
        } else {
            throw mError;
        }

        const vehicleWithMedia = { ...vehicle, vehicle_media: media };

        // Cache for 10 minutes
        await setCache(`vehicle:${req.params.id}`, vehicleWithMedia, 600);

        res.json(vehicleWithMedia);
    } catch (err) {
        console.error('Get vehicle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add vehicle media
app.post('/api/vehicles/:id/media', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const { media_type, url, is_primary } = req.body;
        
        // 1. Try table insert
        const { data: media, error: mError } = await supabaseAdmin
            .from('vehicle_media')
            .insert({ vehicle_id: req.params.id, media_type, url, is_primary: is_primary || false })
            .select()
            .single();

        if (mError && mError.code === 'PGRST205') {
            // 2. Fallback: Update vehicle features.media
            const { data: v } = await supabaseAdmin.from('vehicles').select('features').eq('id', req.params.id).single();
            const existingMedia = v?.features?.media || [];
            const newMediaItem = { id: Date.now(), vehicle_id: req.params.id, media_type, url, is_primary: is_primary || false, created_at: new Date() };
            
            // If setting primary, unset others in the features array
            if (is_primary) existingMedia.forEach(m => m.is_primary = false);
            
            const updatedMedia = [...existingMedia, newMediaItem];
            await supabaseAdmin.from('vehicles').update({ features: { ...v.features, media: updatedMedia } }).eq('id', req.params.id);
            
            // Invalidate cache
            if (redisConnected) {
                await redisClient.del(`vehicle:${req.params.id}`);
            }
            return res.status(201).json(newMediaItem);
        }

        if (mError) throw mError;

        // Invalidate cache
        if (redisConnected) {
            await redisClient.del(`vehicle:${req.params.id}`);
        }

        res.status(201).json(media);
    } catch (err) {
        console.error('Add media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete vehicle media
app.delete('/api/media/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        // 1. Try table delete
        const { data: media, error } = await supabaseAdmin
            .from('vehicle_media')
            .delete()
            .eq('id', req.params.id)
            .select()
            .single();

        if (error && error.code === 'PGRST205') {
            // 2. Fallback: Search all vehicles for this media ID in features.media
            const { data: vehicles } = await supabaseAdmin.from('vehicles').select('id, features');
            for (const v of (vehicles || [])) {
                const mediaIndex = (v.features?.media || []).findIndex(m => String(m.id) === String(req.params.id));
                if (mediaIndex !== -1) {
                    const updatedMedia = v.features.media.filter(m => String(m.id) !== String(req.params.id));
                    await supabaseAdmin.from('vehicles').update({ features: { ...v.features, media: updatedMedia } }).eq('id', v.id);
                    if (redisConnected) await redisClient.del(`vehicle:${v.id}`);
                    return res.json({ message: 'Media deleted from features successfully' });
                }
            }
            return res.status(404).json({ error: 'Media not found' });
        }

        if (error) throw error;
        if (media && redisConnected) await redisClient.del(`vehicle:${media.vehicle_id}`);
        res.json({ message: 'Media deleted successfully' });
    } catch (err) {
        console.error('Delete media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Set primary media
app.patch('/api/media/:id/primary', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const { id } = req.params;
        
        // 1. Get the vehicle_id for this media
        const { data: media, error: getError } = await supabaseAdmin
            .from('vehicle_media')
            .select('vehicle_id')
            .eq('id', id)
            .single();

        if (getError || !media) return res.status(404).json({ error: 'Media not found' });

        // 2. Unset all other primary media for this vehicle
        const { vehicle_id } = req.body;
        
        // 1. Try table update
        const { error } = await supabaseAdmin
            .from('vehicle_media')
            .update({ is_primary: false })
            .eq('vehicle_id', vehicle_id);
            
        if (!error) {
            await supabaseAdmin.from('vehicle_media').update({ is_primary: true }).eq('id', req.params.id);
        } else if (error.code === 'PGRST205') {
            // 2. Fallback: Update features.media
            const { data: v } = await supabaseAdmin.from('vehicles').select('features').eq('id', vehicle_id).single();
            if (v && v.features?.media) {
                const updatedMedia = v.features.media.map(m => ({
                    ...m,
                    is_primary: String(m.id) === String(req.params.id)
                }));
                await supabaseAdmin.from('vehicles').update({ features: { ...v.features, media: updatedMedia } }).eq('id', vehicle_id);
            }
        } else {
            throw error;
        }

        if (redisConnected) await redisClient.del(`vehicle:${vehicle_id}`);
        res.json({ message: 'Primary media updated' });
    } catch (err) {
        console.error('Set primary media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Replace vehicle media
app.post('/api/media/:id/replace', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const { url } = req.body;
        
        // 1. Try table update
        const { data: media, error } = await supabaseAdmin
            .from('vehicle_media')
            .update({ url, updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error && error.code === 'PGRST205') {
            // 2. Fallback: Search all vehicles for this media ID in features.media
            const { data: vehicles } = await supabaseAdmin.from('vehicles').select('id, features');
            for (const v of (vehicles || [])) {
                const existingMedia = v.features?.media || [];
                const mediaIndex = existingMedia.findIndex(m => String(m.id) === String(req.params.id));
                if (mediaIndex !== -1) {
                    existingMedia[mediaIndex].url = url;
                    existingMedia[mediaIndex].updated_at = new Date();
                    await supabaseAdmin.from('vehicles').update({ features: { ...v.features, media: existingMedia } }).eq('id', v.id);
                    if (redisConnected) await redisClient.del(`vehicle:${v.id}`);
                    return res.json(existingMedia[mediaIndex]);
                }
            }
            return res.status(404).json({ error: 'Media not found' });
        }

        if (error) throw error;
        if (media && redisConnected) await redisClient.del(`vehicle:${media.vehicle_id}`);
        res.json(media);
    } catch (err) {
        console.error('Replace media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// File Upload to Supabase Storage
app.post('/api/admin/upload', verifyToken, upload.single('file'), async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `vehicles/${fileName}`;

        const { data, error } = await supabaseAdmin.storage
            .from('vehicle-media')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('vehicle-media')
            .getPublicUrl(filePath);

        res.json({ url: publicUrl, name: file.originalname, type: file.mimetype.startsWith('video') ? 'video' : 'image' });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create vehicle (admin only)
app.post('/api/vehicles', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can create vehicles' });
    }

    try {
        const { 
            name, 
            category, 
            type, 
            license_plate = 'AUTO-' + Date.now(), 
            daily_rate = 0, 
            location = 'N/A', 
            capacity = 0, 
            fuel_type = 'petrol', 
            description = '', 
            features = {} 
        } = req.body;
        
        // Map category to allowed types for DB constraint
        const catClean = (category || 'car').toLowerCase();
        const typeMapping = { 
            'bus': 'bus', 
            'mini bus': 'bus',
            'van': 'van', 
            'vans': 'van',
            'car': 'luxury',
            'luxury car': 'luxury',
            'sedan': 'sedan',
            'suv': 'suv'
        };
        const dbType = typeMapping[catClean] || 'luxury';

        const { data: vehicle, error } = await supabaseAdmin
            .from('vehicles')
            .insert({
                name,
                type: dbType, 
                license_plate,
                daily_rate,
                location,
                capacity,
                fuel_type,
                description,
                features: { ...features, category, model: type },
                status: 'available',
                created_at: new Date(),
            })
            .select()
            .single();

        if (error) throw error;

        // Invalidate cache
        if (redisClient && redisConnected) {
            await redisClient.del('GET:/api/vehicles');
        }

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
        const { category, type, features = {}, ...rest } = req.body;
        
        const updateData = { ...rest, updated_at: new Date() };
        
        if (category) {
            const typeMapping = { 'bus': 'luxury', 'van': 'van', 'car': 'luxury' };
            updateData.type = typeMapping[category] || 'luxury';
            updateData.features = { ...features, category, model: type || features.model };
        }

        const { data: vehicle, error } = await supabaseAdmin
            .from('vehicles')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Invalidate cache
        if (redisClient && redisConnected) {
            await redisClient.del('GET:/api/vehicles');
            await redisClient.del(`vehicle:${req.params.id}`);
        }

        // Broadcast real-time update
        broadcastUpdate('vehicles', 'UPDATE', vehicle);

        res.json(vehicle);
    } catch (err) {
        console.error('Update vehicle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete vehicle (admin only)
app.delete('/api/vehicles/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete vehicles' });
    }

    try {
        const { id } = req.params;

        // 1. Delete media first (due to FK)
        await supabaseAdmin.from('vehicle_media').delete().eq('vehicle_id', id);

        // 2. Delete vehicle
        const { error } = await supabaseAdmin
            .from('vehicles')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Invalidate cache
        if (redisClient && redisConnected) {
            await redisClient.del('GET:/api/vehicles');
            await redisClient.del(`vehicle:${id}`);
        }

        // 4. Broadcast update
        broadcastUpdate('vehicles', 'DELETE', { id });

        res.json({ message: 'Vehicle deleted successfully' });
    } catch (err) {
        console.error('Delete vehicle error:', err);
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
        if (redisClient && redisConnected) {
            await redisClient.del('GET:/api/vehicles');
        }

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
            .select('*, vehicle:vehicles(*)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch user bookings error:', error);
            return res.json([]);
        }

        res.json(bookings || []);
    } catch (err) {
        console.error('Get bookings error:', err.message);
        res.status(500).json({ error: 'Internal server error', details: err.message });
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
        if (redisClient && redisConnected) {
            await redisClient.del('GET:/api/vehicles');
        }

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

        if (redisConnected && redisClient) {
            try {
                const cached = await redisClient.get(cacheKey);
                if (cached) return res.json(JSON.parse(cached));
            } catch (e) { console.warn('Cache get failed'); }
        }

        // 1. Get Base Totals
        const [resVehicles, resUsers] = await Promise.all([
            supabase.from('vehicles').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true })
        ]);

        const totalVehicles = resVehicles.count || 0;
        const totalUsers = resUsers.count || 0;
        console.log('Analytics Base:', { totalVehicles, totalUsers });

        // 2. Get Official Bookings with Vehicle Type
        const { data: bookings } = await supabaseAdmin
            .from('bookings')
            .select('status, created_at, total_cost, vehicle:vehicles(type)');

        // 3. Get Public Inquiries
        const { data: inquiries } = await supabaseAdmin
            .from('booking_requests')
            .select('status, created_at, mode_of_transport');

        // 4. Aggregate Stats
        let confirmedCount = 0;
        let rejectedCount = 0;
        let totalRevenue = 0;

        const monthlyFreq = {}; // { 'YYYY-MM': { confirmed: 0, rejected: 0, bus: 0, car: 0, van: 0 } }
        const yearlyFreq = {};  // { 'YYYY': { confirmed: 0, rejected: 0 } }

        const processItem = (item, type) => {
            const date = new Date(item.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const yearKey = `${date.getFullYear()}`;

            if (!monthlyFreq[monthKey]) monthlyFreq[monthKey] = { confirmed: 0, rejected: 0, bus: 0, car: 0, van: 0 };
            if (!yearlyFreq[yearKey]) yearlyFreq[yearKey] = { confirmed: 0, rejected: 0 };

            // Determine if confirmed or rejected based on table type and status
            let isConfirmed = false;
            let isRejected = false;

            if (type === 'booking') {
                isConfirmed = item.status === 'confirmed' || item.status === 'completed';
                isRejected = item.status === 'cancelled';
                if (isConfirmed) totalRevenue += Number(item.total_cost || 0);
            } else {
                isConfirmed = item.status === 'confirmed';
                isRejected = item.status === 'cancelled' || item.status === 'rejected';
            }

            if (isConfirmed) {
                confirmedCount++;
                monthlyFreq[monthKey].confirmed++;
                yearlyFreq[yearKey].confirmed++;

                // Track vehicle category
                let vCat = '';
                if (type === 'booking') {
                    const vType = item.vehicle?.type?.toLowerCase() || '';
                    if (vType === 'van') vCat = 'van';
                    else if (['sedan', 'suv', 'luxury', 'car'].includes(vType)) vCat = 'car';
                    else vCat = 'bus'; // Default for rentals
                } else {
                    vCat = (item.mode_of_transport || '').toLowerCase();
                }

                if (vCat === 'bus') monthlyFreq[monthKey].bus++;
                else if (vCat === 'car') monthlyFreq[monthKey].car++;
                else if (vCat === 'van') monthlyFreq[monthKey].van++;

            } else if (isRejected) {
                rejectedCount++;
                monthlyFreq[monthKey].rejected++;
                yearlyFreq[yearKey].rejected++;
            }
        };

        (bookings || []).forEach(b => processItem(b, 'booking'));
        (inquiries || []).forEach(i => processItem(i, 'inquiry'));

        const result = {
            totalVehicles,
            totalUsers,
            totalBookings: confirmedCount,
            confirmedCount,
            rejectedCount,
            totalRevenue,
            monthlyStats: monthlyFreq,
            yearlyStats: yearlyFreq,
            timestamp: new Date(),
        };

        console.log('Final Analytics:', JSON.stringify(result, null, 2));

        // Cache for 5 mins for live-ish feel
        await setCache(cacheKey, result, 300);

        res.json(result);
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get detailed bookings for analytics
app.get('/api/admin/analytics/bookings', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view detailed analytics' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                vehicle:vehicles(name, type, license_plate)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch bookings error:', error);
            // Return empty array if table empty or error occurs to prevent frontend crash
            return res.json([]);
        }
        res.json(data || []);
    } catch (err) {
        console.error('Analytics bookings error:', err);
        res.json([]); // Fallback to empty array
    }
});

// Get ALL bookings (Official + Public Inquiries) for Admin
app.get('/api/admin/all-bookings', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // 1. Fetch Official Bookings
        const { data: official, error: err1 } = await supabaseAdmin
            .from('bookings')
            .select('*, vehicle:vehicles(name, type, license_plate)')
            .order('created_at', { ascending: false });

        // 2. Fetch Confirmed Inquiry Requests
        const { data: requests, error: err2 } = await supabaseAdmin
            .from('booking_requests')
            .select('*')
            .neq('status', 'pending') // Only show processed ones in the main bookings list
            .order('created_at', { ascending: false });

        if (err1) throw err1;
        if (err2) throw err2;

        // 3. Format inquiries to match the booking structure for the table
        const formattedRequests = (requests || []).map(r => ({
            id: r.id,
            user_id: 'Public Inquiry',
            vehicle_name: r.mode_of_transport ? (r.mode_of_transport.charAt(0).toUpperCase() + r.mode_of_transport.slice(1)) : 'Vehicle',
            start_date: r.start_date,
            end_date: r.end_date,
            total_cost: 0, // Inquiries don't have cost yet
            status: r.status,
            is_inquiry: true,
            customer_name: r.customer_name
        }));

        const unified = [
            ...(official || []).map(b => ({ ...b, vehicle_name: b.vehicle?.name, is_inquiry: false })),
            ...formattedRequests
        ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        res.json(unified);
    } catch (err) {
        console.error('All Bookings Fetch Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Public Booking Requests ====================

app.post('/api/public/bookings', async (req, res) => {
    const {
        customer_name,
        customer_phone,
        pickup_location,
        destination,
        purpose_of_trip,
        visited_places,
        start_date,
        end_date,
        total_days,
        mode_of_transport
    } = req.body;

    try {
        // 1. Save to Database
        const { data, error } = await supabaseAdmin
            .from('booking_requests')
            .insert([{
                customer_name,
                customer_phone,
                pickup_location,
                destination,
                purpose_of_trip,
                visited_places,
                start_date,
                end_date,
                total_days,
                mode_of_transport,
                status: 'pending'
            }])
            .select();

        if (error) throw error;

        // 2. Send Email Notification
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: parseInt(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: 'mrcholidays73@gmail.com',
            subject: `📋 NEW INQUIRY: ${customer_name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; background-color: #f8fafc; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #3b82f6; margin-bottom: 24px; font-size: 24px;">New Booking Inquiry</h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <p style="margin: 10px 0;"><strong>👤 Customer Name:</strong> ${customer_name}</p>
                        <p style="margin: 10px 0;"><strong>📞 Phone Number:</strong> ${customer_phone}</p>
                        <p style="margin: 10px 0;"><strong>🚗 Transport Mode:</strong> ${mode_of_transport || 'N/A'}</p>
                        <p style="margin: 10px 0;"><strong>📍 Route:</strong> ${pickup_location} to ${destination}</p>
                        <p style="margin: 10px 0;"><strong>📅 Dates:</strong> ${start_date} to ${end_date} (${total_days} Days)</p>
                        <p style="margin: 10px 0;"><strong>📍 Visited Places:</strong> ${visited_places || 'N/A'}</p>
                        <p style="margin: 10px 0;"><strong>🎯 Trip Purpose:</strong> ${purpose_of_trip || 'General Rental'}</p>
                    </div>

                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/admin-dashboard.html" 
                           style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Open Admin Dashboard
                        </a>
                    </div>
                    
                    <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">
                        This inquiry has been automatically saved to your dashboard.
                    </p>
                </div>
            `
        };

        console.log(`📧 Attempting to send inquiry email to: mrcholidays73@gmail.com for ${customer_name}`);
        
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ Email notification failed!');
                console.error('Error Code:', error.code);
                console.error('Message:', error.message);
                if (error.code === 'EAUTH') {
                    console.error('👉 TIP: Check your SMTP_USER and SMTP_PASS (App Password) in .env');
                }
            } else {
                console.log('✅ Email notification sent successfully:', info.response);
            }
        });

        res.status(201).json({ message: 'Booking request received', data: data[0] });
    } catch (err) {
        console.error('Booking submission error:', err.message);
        res.status(500).json({ error: 'Failed to process booking request' });
    }
});

// ==================== Public Email Action Links ====================

app.get('/api/booking-requests/:id/action/:status', async (req, res) => {
    try {
        const { id, status } = req.params;
        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).send('Invalid status');
        }

        const { error } = await supabaseAdmin
            .from('booking_requests')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        // Broadcast real-time update
        broadcastUpdate('booking_requests', 'UPDATE', { id, status });

        res.send(`
            <html>
            <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #020617; color: white;">
                <div style="text-align: center; padding: 40px; background: rgba(255,255,255,0.1); border-radius: 16px;">
                    <h1 style="color: ${status === 'confirmed' ? '#10b981' : '#ef4444'};">Inquiry ${status.charAt(0).toUpperCase() + status.slice(1)}!</h1>
                    <p>The booking request has been successfully updated in the database.</p>
                    <a href="http://localhost:3000/admin-dashboard.html" style="color: #3b82f6; text-decoration: none; margin-top: 20px; display: inline-block;">Go to Admin Dashboard</a>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send('Error updating request: ' + err.message);
    }
});

// ==================== Admin: Fetch Booking Requests ====================

app.get('/api/admin/booking-requests', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('booking_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/admin/booking-requests/:id/status', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const { status } = req.body;
        const { data, error } = await supabaseAdmin
            .from('booking_requests')
            .update({ status })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        broadcastUpdate('booking_requests', 'UPDATE', { id: req.params.id, status });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Assign vehicle to inquiry
app.post('/api/admin/booking-requests/:id/assign', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    
    const { vehicle_id, total_cost } = req.body;
    const { id } = req.params;

    try {
        // 1. Fetch Request Details
        const { data: request, error: fetchError } = await supabaseAdmin
            .from('booking_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // 2. Update Booking Request Status (Keep as 'confirmed' to pass DB constraint)
        const { error: reqError } = await supabaseAdmin
            .from('booking_requests')
            .update({ status: 'confirmed' })
            .eq('id', id);

        if (reqError) throw reqError;

        // 3. Update Vehicle Status
        const { error: vehError } = await supabaseAdmin
            .from('vehicles')
            .update({ status: 'booked' })
            .eq('id', vehicle_id);

        if (vehError) throw vehError;

        // 4. Create a Formal Booking Entry
        const { error: bookError } = await supabaseAdmin
            .from('bookings')
            .insert([{
                booking_id: `INQ-${id.toString().slice(0, 8)}`,
                user_id: req.user.id, // Assigned by admin
                vehicle_id: vehicle_id,
                start_date: request.start_date,
                end_date: request.end_date,
                pickup_location: request.pickup_location,
                return_location: request.destination,
                total_amount: total_cost || 0,
                status: 'confirmed',
                notes: `Assigned from Inquiry: ${request.customer_name} (${request.customer_phone})`
            }]);

        if (bookError) {
            console.error('Shadow booking creation failed:', bookError);
            // Non-fatal if the rest worked, but let's notify
        }

        broadcastUpdate('booking_requests', 'UPDATE', { id, status: 'confirmed' });
        broadcastUpdate('vehicles', 'UPDATE', { id: vehicle_id, status: 'booked' });
        broadcastUpdate('bookings', 'INSERT', { vehicle_id });

        res.json({ message: 'Vehicle assigned and booking created successfully' });
    } catch (err) {
        console.error('Assign vehicle error:', err);
        res.status(500).json({ error: err.message });
    }
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
// Diagnostic: Test Email Configuration
app.post('/api/admin/test-email', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    
    try {
        const testTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: parseInt(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await testTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.SMTP_USER, // Send to self
            subject: '📋 MRC Rentals: Email Configuration Test',
            text: 'Your email settings are working perfectly! You created this test from the Admin Dashboard.'
        });

        res.json({ message: 'Success! Test email sent to ' + process.env.SMTP_USER });
    } catch (err) {
        console.error('Email test error:', err);
        res.status(500).json({ error: 'Failure: ' + err.message });
    }
});
