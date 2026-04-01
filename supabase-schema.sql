-- Vehicle Rental Management System - Supabase Schema
-- PostgreSQL Tables for Placement-Level Project

-- ==================== Users Table ====================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
  license_number VARCHAR(50),
  aadhar_number VARCHAR(20),
  address TEXT,
  date_of_birth DATE,
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== Vehicles Table ====================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('sedan', 'suv', 'truck', 'van', 'bike', 'luxury')),
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  daily_rate DECIMAL(10, 2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  capacity INT NOT NULL,
  fuel_type VARCHAR(50) CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid')),
  mileage INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'maintenance', 'inactive')),
  image_url TEXT,
  description TEXT,
  features JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== Vehicle Media Table ====================
CREATE TABLE IF NOT EXISTS vehicle_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_media_vehicle_id ON vehicle_media(vehicle_id);

-- ==================== Bookings Table ====================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  special_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== Payments Table ====================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'debit_card', 'upi', 'wallet', 'cash')),
  transaction_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== Reviews Table ====================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== SMS Verification Table ====================
CREATE TABLE IF NOT EXISTS sms_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  attempt_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- ==================== Audit Log Table ====================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== Indexes ====================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);

-- SMS Verification indexes
CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_verification(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_expires ON sms_verification(expires_at);

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);

-- ==================== Replication Setup (Real-time) ====================

-- Enable Replication on Tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- ==================== Row Level Security (RLS) ====================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users RLS: Users can only see their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text OR (
    SELECT role FROM users WHERE id = auth.uid()::uuid
  ) = 'admin');

-- Bookings RLS: Users can only see their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid()::uuid OR (
    SELECT role FROM users WHERE id = auth.uid()::uuid
  ) = 'admin');

-- Payments RLS: Users can only see their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (booking_id IN (
    SELECT id FROM bookings WHERE user_id = auth.uid()::uuid
  ) OR (
    SELECT role FROM users WHERE id = auth.uid()::uuid
  ) = 'admin');

-- Reviews RLS: Users can view all reviews
CREATE POLICY "Users can view all reviews"
  ON reviews FOR SELECT
  USING (TRUE);

-- Create reviews policy for inserting
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (user_id = auth.uid()::uuid);

-- ==================== Views for Analytics ====================

-- View: Available vehicles
CREATE VIEW available_vehicles AS
SELECT v.*, 
  COUNT(b.id) as total_bookings,
  AVG(r.rating) as avg_rating
FROM vehicles v
LEFT JOIN bookings b ON v.id = b.vehicle_id
LEFT JOIN reviews r ON v.id = r.vehicle_id
WHERE v.status = 'available'
GROUP BY v.id;

-- View: User booking history
CREATE VIEW user_booking_history AS
SELECT b.*, 
  v.name as vehicle_name,
  v.type as vehicle_type,
  u.name as user_name
FROM bookings b
JOIN vehicles v ON b.vehicle_id = v.id
JOIN users u ON b.user_id = u.id;

-- View: Revenue stats
CREATE VIEW revenue_stats AS
SELECT 
  DATE_TRUNC('month', p.created_at)::DATE as month,
  COUNT(DISTINCT p.booking_id) as total_bookings,
  SUM(p.amount) as total_revenue,
  AVG(p.amount) as avg_booking_value
FROM payments p
WHERE p.status = 'completed'
GROUP BY DATE_TRUNC('month', p.created_at);

-- ==================== Booking Requests (Static Form) ====================
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  purpose_of_trip VARCHAR(255),
  visited_places TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  total_days INT,
  mode_of_transport VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'confirmed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_phone ON booking_requests(customer_phone);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
