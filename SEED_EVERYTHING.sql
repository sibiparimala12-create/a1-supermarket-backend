-- ==========================================
-- A1 SUPERMARKET: "BUSINESS ALIVE" SEED SCRIPT
-- ==========================================
-- This script will:
-- 1. Create 5 Categories
-- 2. Create 20+ Real Products
-- 3. Create 5 Test Customers (Profiles)
-- 4. Create 10+ Demo Orders (For Analytics)
-- ==========================================

-- STEP 1: RESET (CLEAN SLATE)
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;
TRUNCATE TABLE profiles RESTART IDENTITY CASCADE;

-- STEP 2: CATEGORIES
INSERT INTO categories (name, slug, image_url) VALUES
('Fruits & Vegetables', 'fruits-vegetables', 'https://cdn-icons-png.flaticon.com/512/2329/2329865.png'),
('Dairy, Bread & Eggs', 'dairy-bread', 'https://cdn-icons-png.flaticon.com/512/3050/3050158.png'),
('Snacks & Munchies', 'snacks-munchies', 'https://cdn-icons-png.flaticon.com/512/2553/2553691.png'),
('Cold Drinks & Juices', 'drinks-juices', 'https://cdn-icons-png.flaticon.com/512/3050/3050130.png'),
('Atta, Rice & Dal', 'staples', 'https://cdn-icons-png.flaticon.com/512/2390/2390497.png');

-- STEP 3: PRODUCTS
DO $$ 
DECLARE 
    cat_dairy UUID; cat_fruits UUID; cat_staples UUID; cat_snacks UUID; cat_drinks UUID;
BEGIN
    SELECT id INTO cat_dairy FROM categories WHERE slug = 'dairy-bread';
    SELECT id INTO cat_fruits FROM categories WHERE slug = 'fruits-vegetables';
    SELECT id INTO cat_staples FROM categories WHERE slug = 'staples';
    SELECT id INTO cat_snacks FROM categories WHERE slug = 'snacks-munchies';
    SELECT id INTO cat_drinks FROM categories WHERE slug = 'drinks-juices';

    -- Dairy
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_dairy, 'Amul Gold Milk', 'amul-gold-milk-1l', 66, 64, 100, '1L', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_160.jpg"}'),
    (cat_dairy, 'Amul Salted Butter', 'amul-butter-100g', 58, 56, 150, '100g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_271.jpg"}'),
    (cat_dairy, 'Mother Dairy Curd', 'mother-dairy-curd-400g', 35, 32, 80, '400g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_27471.jpg"}'),
    (cat_dairy, 'Britannia Wheat Bread', 'britannia-wheat-bread', 50, 45, 40, '400g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_3256.jpg"}');

    -- Fruits
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_fruits, 'Nagpur Oranges', 'nagpur-oranges-1kg', 120, 99, 5, '1kg', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39151.jpg"}'),
    (cat_fruits, 'Fresh Bananas', 'bananas-6pcs', 40, 35, 60, '6pcs', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39146.jpg"}'),
    (cat_fruits, 'Shimla Apples', 'shimla-apples-1kg', 180, 165, 30, '1kg', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39149.jpg"}');

    -- Staples
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_staples, 'Aashirvaad Atta', 'aashirvaad-atta-5kg', 245, 225, 80, '5kg', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_47.jpg"}'),
    (cat_staples, 'Fortune Oil', 'fortune-oil-1l', 160, 145, 120, '1L', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_10.jpg"}'),
    (cat_staples, 'Daawat Basmati Rice', 'daawat-rice-1kg', 110, 95, 200, '1kg', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_3030.jpg"}');

    -- Snacks
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_snacks, 'Maggi Noodles', 'maggi-8-pack', 112, 105, 150, '560g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_32.jpg"}'),
    (cat_snacks, 'Lay''s Classic Chips', 'lays-classic-salted', 20, 18, 3, '50g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_26.jpg"}'),
    (cat_snacks, 'Haldiram Namkeen', 'haldiram-bhujia', 45, 40, 90, '200g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_100.jpg"}');

    -- Drinks
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_drinks, 'Coca Cola', 'coke-2l', 95, 85, 40, '2L', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_212.jpg"}'),
    (cat_drinks, 'Real Mango Juice', 'real-mango-1l', 120, 110, 35, '1L', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_23423.jpg"}');

END $$;

-- STEP 4: TEST PROFILES
-- IDs are fixed UUIDs for simplicity in this demo script
INSERT INTO profiles (id, full_name, phone_number, delivery_address) VALUES
('00000000-0000-0000-0000-000000000001', 'Rahul Sharma', '9876543210', 'H.No 123, Jubilee Hills, Hyderabad'),
('00000000-0000-0000-0000-000000000002', 'Ananya Iyer', '9876543211', 'Flat 402, Prestige Apts, Bangalore'),
('00000000-0000-0000-0000-000000000003', 'Vikram Singh', '9876543212', 'Sector 15, Vashi, Mumbai');

-- STEP 5: DEMO ORDERS
INSERT INTO orders (id, user_id, status, total_amount, payment_method, payment_status, delivery_address) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'delivered', 850.00, 'UPI', 'paid', 'Jubilee Hills, Hyderabad'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'pending', 1240.00, 'COD', 'unpaid', 'Prestige Apts, Bangalore'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'packed', 450.00, 'UPI', 'paid', 'Sector 15, Mumbai'),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'pending', 320.00, 'COD', 'unpaid', 'Jubilee Hills, Hyderabad');
