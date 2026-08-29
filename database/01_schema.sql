-- =====================================================
-- ERS - Electronic Resale System
-- Database Schema - PostgreSQL
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE product_condition AS ENUM ('new', 'used');
CREATE TYPE product_category AS ENUM (
  'cpu', 'gpu', 'ram', 'storage', 'motherboard', 'psu', 
  'case', 'cooling', 'monitor', 'keyboard', 'mouse', 
  'phone', 'tablet', 'other'
);
CREATE TYPE product_status AS ENUM ('draft', 'pending', 'verified', 'published', 'sold');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'in_custody', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE verification_result AS ENUM ('pass', 'fail', 'conditional');
CREATE TYPE review_type AS ENUM ('positive', 'neutral', 'complaint');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'resolved');

-- =====================================================
-- TABLA: users
-- =====================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(500),
  role user_role DEFAULT 'buyer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- =====================================================
-- TABLA: products
-- =====================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  condition product_condition NOT NULL,
  category product_category NOT NULL,
  status product_status DEFAULT 'draft',
  images TEXT,
  hours_of_use INTEGER,
  physical_state VARCHAR(500),
  brand VARCHAR(100),
  model VARCHAR(200),
  average_rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT positive_price CHECK (price >= 0),
  CONSTRAINT positive_hours CHECK (hours_of_use >= 0)
);

CREATE INDEX idx_products_status_category ON products(status, category);
CREATE INDEX idx_products_seller_status ON products(seller_id, status);
CREATE INDEX idx_products_condition_status ON products(condition, status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- =====================================================
-- TABLA: orders
-- =====================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total DECIMAL(10,2) NOT NULL,
  status order_status DEFAULT 'pending',
  shipping_address VARCHAR(500),
  payment_method VARCHAR(50),
  custody_start_date TIMESTAMPTZ,
  custody_end_date TIMESTAMPTZ,
  cancellation_reason TEXT,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_total CHECK (total >= 0)
);

CREATE INDEX idx_orders_buyer_status ON orders(buyer_id, status);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- =====================================================
-- TABLA: verifications
-- =====================================================

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result verification_result NOT NULL,
  notes TEXT NOT NULL,
  hours_of_use INTEGER,
  physical_state VARCHAR(500),
  functional_test VARCHAR(500),
  cosmetic_grade VARCHAR(10),
  quality_score DECIMAL(3,2),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_verification_hours CHECK (hours_of_use >= 0),
  CONSTRAINT valid_quality_score CHECK (quality_score >= 0 AND quality_score <= 5)
);

CREATE INDEX idx_verifications_product_result ON verifications(product_id, result);
CREATE INDEX idx_verifications_verified_by ON verifications(verified_by);

-- =====================================================
-- TABLA: reviews
-- =====================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating SMALLINT NOT NULL,
  type review_type NOT NULL,
  status review_status DEFAULT 'pending',
  comment TEXT,
  seller_rating SMALLINT,
  product_rating SMALLINT,
  complaint_reason TEXT,
  resolution_notes TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT valid_seller_rating CHECK (seller_rating IS NULL OR (seller_rating >= 1 AND seller_rating <= 5)),
  CONSTRAINT valid_product_rating CHECK (product_rating IS NULL OR (product_rating >= 1 AND product_rating <= 5)),
  CONSTRAINT unique_buyer_product UNIQUE(buyer_id, product_id)
);

CREATE INDEX idx_reviews_seller_status ON reviews(seller_id, status);
CREATE INDEX idx_reviews_product_status ON reviews(product_id, status);
CREATE INDEX idx_reviews_buyer_id ON reviews(buyer_id);

-- =====================================================
-- TABLA: categories (secundaria)
-- =====================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: product_images (secundaria)
-- =====================================================

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- =====================================================
-- TABLA: addresses (secundaria)
-- =====================================================

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  street VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Argentina',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- =====================================================
-- TABLA: favorites (secundaria)
-- =====================================================

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_product UNIQUE(user_id, product_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- =====================================================
-- TABLA: messages (secundaria)
-- =====================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- =====================================================
-- TABLA: notifications (secundaria)
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- =====================================================
-- TABLA: verification_checklist (secundaria)
-- =====================================================

CREATE TABLE verification_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category product_category NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_category ON verification_checklist(category);

-- =====================================================
-- TABLA: verification_items (secundaria)
-- =====================================================

CREATE TABLE verification_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES verification_checklist(id),
  result VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_items_verification ON verification_items(verification_id);

-- =====================================================
-- FUNCTION: update_updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS: auto-update updated_at
-- =====================================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
