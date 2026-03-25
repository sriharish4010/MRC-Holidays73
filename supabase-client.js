// ==================== Supabase Real-time Client ====================
// Usage: Import this in your HTML pages for real-time updates

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://czocnfvusoybakoohwzm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NuZnZ1c295YmFrb29od3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDc1NjcsImV4cCI6MjA4OTM4MzU2N30.NqTxA1elrisXHzYXCRQqON-q8Y-nWzUuRgnH6D-sor0';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== Real-time Subscriptions ====================

/**
 * Subscribe to real-time updates
 * @param {string} table - Table name to subscribe to
 * @param {function} callback - Callback function when data changes
 */
export const subscribeToRealtimeUpdates = (table, callback) => {
    const subscription = supabase
        .channel(`${table}:*`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: table },
            (payload) => {
                console.log(`📡 Real-time update on ${table}:`, payload);
                callback(payload);
            },
        )
        .subscribe();

    return subscription;
};

/**
 * Subscribe to vehicle availability changes
 */
export const subscribeToVehicles = (callback) => {
    return subscribeToRealtimeUpdates('vehicles', callback);
};

/**
 * Subscribe to booking changes
 */
export const subscribeToBookings = (callback) => {
    return subscribeToRealtimeUpdates('bookings', callback);
};

/**
 * Subscribe to user profile changes
 */
export const subscribeToUsers = (callback) => {
    return subscribeToRealtimeUpdates('users', callback);
};

// ==================== Authentication ====================

/**
 * Register new user
 */
export const registerUser = async (email, password, name, phone) => {
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, phone }),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();

        // Store token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    } catch (err) {
        console.error('Registration error:', err);
        throw err;
    }
};

/**
 * Login user
 */
export const loginUser = async (email, password) => {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();

        // Store token and user
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    } catch (err) {
        console.error('Login error:', err);
        throw err;
    }
};

/**
 * Logout user
 */
export const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

/**
 * Get stored user
 */
export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

/**
 * Get JWT token
 */
export const getToken = () => {
    return localStorage.getItem('token');
};

// ==================== Vehicles ====================

/**
 * Get all available vehicles
 */
export const getVehicles = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/vehicles');
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        return await response.json();
    } catch (err) {
        console.error('Get vehicles error:', err);
        throw err;
    }
};

/**
 * Get vehicle by ID
 */
export const getVehicle = async (vehicleId) => {
    try {
        const response = await fetch(`http://localhost:5000/api/vehicles/${vehicleId}`);
        if (!response.ok) throw new Error('Vehicle not found');
        return await response.json();
    } catch (err) {
        console.error('Get vehicle error:', err);
        throw err;
    }
};

/**
 * Create new vehicle (admin only)
 */
export const createVehicle = async (vehicleData) => {
    try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/vehicles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(vehicleData),
        });

        if (!response.ok) throw new Error('Failed to create vehicle');
        return await response.json();
    } catch (err) {
        console.error('Create vehicle error:', err);
        throw err;
    }
};

/**
 * Update vehicle status
 */
export const updateVehicleStatus = async (vehicleId, status) => {
    try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/vehicles/${vehicleId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) throw new Error('Failed to update vehicle');
        return await response.json();
    } catch (err) {
        console.error('Update vehicle error:', err);
        throw err;
    }
};

// ==================== Bookings ====================

/**
 * Create new booking
 */
export const createBooking = async (vehicleId, startDate, endDate) => {
    try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                vehicle_id: vehicleId,
                start_date: startDate,
                end_date: endDate,
            }),
        });

        if (!response.ok) throw new Error('Failed to create booking');
        return await response.json();
    } catch (err) {
        console.error('Create booking error:', err);
        throw err;
    }
};

/**
 * Get user bookings
 */
export const getUserBookings = async () => {
    try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/bookings', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch bookings');
        return await response.json();
    } catch (err) {
        console.error('Get bookings error:', err);
        throw err;
    }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId) => {
    try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/cancel`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to cancel booking');
        return await response.json();
    } catch (err) {
        console.error('Cancel booking error:', err);
        throw err;
    }
};

// ==================== User Profile ====================

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
    try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch profile');
        return await response.json();
    } catch (err) {
        console.error('Get profile error:', err);
        throw err;
    }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, profileData) => {
    try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
        });

        if (!response.ok) throw new Error('Failed to update profile');
        return await response.json();
    } catch (err) {
        console.error('Update profile error:', err);
        throw err;
    }
};

// ==================== Admin Analytics ====================

/**
 * Get dashboard analytics
 */
export const getAnalytics = async () => {
    try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/admin/analytics', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch analytics');
        return await response.json();
    } catch (err) {
        console.error('Get analytics error:', err);
        throw err;
    }
};

// ==================== WebSocket Real-time ====================

let ws = null;

/**
 * Connect to WebSocket for real-time updates
 */
export const connectWebSocket = (onMessage) => {
    ws = new WebSocket('ws://localhost:5000');

    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        // Subscribe to all updates
        ws.send(JSON.stringify({ type: 'subscribe', table: '*' }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📡 WebSocket message:', data);
        if (onMessage) onMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
    };

    return ws;
};

/**
 * Disconnect WebSocket
 */
export const disconnectWebSocket = () => {
    if (ws) {
        ws.close();
        ws = null;
    }
};

/**
 * Subscribe to specific table updates via WebSocket
 */
export const subscribeWebSocket = (table) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribe', table }));
    }
};

// ==================== Utility Functions ====================

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
    return !!getToken() && !!getUser();
};

/**
 * Check if user is admin
 */
export const isAdmin = () => {
    const user = getUser();
    return user?.role === 'admin';
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);
};

/**
 * Calculate days between dates
 */
export const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};
