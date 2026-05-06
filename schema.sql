-- A1 Supermarket Database Schema (Supabase/PostgreSQL)

-- 1. Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_urls TEXT[] DEFAULT '{}',
    unit TEXT DEFAULT 'pcs', -- e.g., 'kg', 'packet', 'pcs'
    is_trending BOOLEAN DEFAULT FALSE,
    is_recommended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users (Auth handled by Supabase, this is the profiles table)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone_number TEXT UNIQUE,
    delivery_address TEXT,
    push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- pending, packed, out_for_delivery, delivered, cancelled
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_charge DECIMAL(10, 2) DEFAULT 0.00,
    payment_method TEXT DEFAULT 'COD', -- COD, UPI, Card
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid
    delivery_address TEXT NOT NULL,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10, 2) NOT NULL
);

-- 6. Low Stock Alerts (Admin view or trigger)
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT id, name, stock_quantity
FROM products
WHERE stock_quantity < 5;

-- 7. Admin Users
CREATE TABLE admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff', -- staff, super_admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Add missing security columns to live database
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 9. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public Read Access for Catalog
CREATE POLICY "Public can view products" ON products FOR SELECT USING (true);

-- Order Access
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);

-- Order Items Access
CREATE POLICY "Users can insert own order items" ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- 10. Secure Server-Side Pricing Logic
-- Trigger to auto-fetch correct price and update the parent order total
CREATE OR REPLACE FUNCTION secure_calculate_order_item()
RETURNS TRIGGER AS $$
DECLARE
    actual_price DECIMAL(10, 2);
BEGIN
    -- Fetch the correct current price from products table
    SELECT COALESCE(discount_price, price) INTO actual_price 
    FROM products WHERE id = NEW.product_id;
    
    -- Enforce the correct price
    NEW.price_at_time := actual_price;
    
    -- Update the parent order total
    UPDATE orders 
    SET total_price = total_price + (NEW.quantity * actual_price)
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_secure_calculate_order_item ON order_items;
CREATE TRIGGER tr_secure_calculate_order_item 
BEFORE INSERT ON order_items 
FOR EACH ROW EXECUTE PROCEDURE secure_calculate_order_item();
