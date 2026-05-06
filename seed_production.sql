-- A1 Supermarket Production Seed Script
-- Real Indian Brands with INR (₹) Pricing

-- 1. Insert Categories
INSERT INTO categories (name, slug, image_url) VALUES
('Fruits & Vegetables', 'fruits-vegetables', 'https://cdn-icons-png.flaticon.com/512/2329/2329865.png'),
('Dairy, Bread & Eggs', 'dairy-bread', 'https://cdn-icons-png.flaticon.com/512/3050/3050158.png'),
('Snacks & Munchies', 'snacks-munchies', 'https://cdn-icons-png.flaticon.com/512/2553/2553691.png'),
('Cold Drinks & Juices', 'drinks-juices', 'https://cdn-icons-png.flaticon.com/512/3050/3050130.png'),
('Tea, Coffee & Health Drinks', 'tea-coffee', 'https://cdn-icons-png.flaticon.com/512/3503/3503461.png'),
('Atta, Rice & Dal', 'staples', 'https://cdn-icons-png.flaticon.com/512/2390/2390497.png'),
('Masalas & Spices', 'spices', 'https://cdn-icons-png.flaticon.com/512/2329/2329903.png'),
('Personal Care', 'personal-care', 'https://cdn-icons-png.flaticon.com/512/2913/2913465.png');

-- 2. Insert Products (Dairy)
DO $$ 
DECLARE 
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM categories WHERE slug = 'dairy-bread';
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_id, 'Amul Gold Milk', 'amul-gold-milk-1l', 66.00, 64.00, 100, '1L', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_160.jpg"}'),
    (cat_id, 'Amul Taaza Milk', 'amul-taaza-milk-500ml', 27.00, null, 200, '500ml', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_161.jpg"}'),
    (cat_id, 'Amul Salted Butter', 'amul-butter-100g', 58.00, 56.00, 150, '100g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_271.jpg"}'),
    (cat_id, 'Britannia 100% Whole Wheat Bread', 'britannia-wheat-bread', 50.00, 45.00, 40, '400g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_3256.jpg"}'),
    (cat_id, 'Mother Dairy Paneer', 'mother-dairy-paneer-200g', 90.00, 85.00, 50, '200g', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_285.jpg"}');
END $$;

-- 3. Insert Products (Staples)
DO $$ 
DECLARE 
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM categories WHERE slug = 'staples';
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_id, 'Aashirvaad Shudh Chakki Atta', 'aashirvaad-atta-5kg', 245.00, 225.00, 80, '5kg', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_47.jpg"}'),
    (cat_id, 'Fortune Sunlite Refined Sunflower Oil', 'fortune-oil-1l', 160.00, 145.00, 120, '1L', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_10.jpg"}'),
    (cat_id, 'Daawat Rozana Super Basmati Rice', 'daawat-rice-5kg', 450.00, 399.00, 60, '5kg', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_24157.jpg"}'),
    (cat_id, 'Tata Salt', 'tata-salt-1kg', 28.00, null, 500, '1kg', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_6.jpg"}'),
    (cat_id, 'Catch Turmeric Powder', 'catch-turmeric-200g', 60.00, 54.00, 100, '200g', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_1382.jpg"}');
END $$;

-- 4. Insert Products (Snacks)
DO $$ 
DECLARE 
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM categories WHERE slug = 'snacks-munchies';
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_id, 'Maggi 2-Minute Instant Noodles', 'maggi-8-pack', 112.00, 105.00, 150, '560g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_32.jpg"}'),
    (cat_id, 'Lay''s Classic Salted Potato Chips', 'lays-classic-salted', 20.00, null, 300, '50g', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_26.jpg"}'),
    (cat_id, 'Haldiram''s Alu Bhujia', 'haldirams-alu-bhujia-200g', 55.00, 50.00, 120, '200g', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_332.jpg"}'),
    (cat_id, 'Parle-G Gluco Biscuits', 'parle-g-800g', 80.00, 75.00, 200, '800g', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_151.jpg"}'),
    (cat_id, 'Hide & Seek Chocolate Chip Cookies', 'hide-seek-100g', 30.00, 28.00, 100, '100g', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_153.jpg"}');
END $$;

-- 5. Insert Products (Fruits/Veg) - Simulating generic high quality links
DO $$ 
DECLARE 
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM categories WHERE slug = 'fruits-vegetables';
    INSERT INTO products (category_id, name, slug, price, discount_price, stock_quantity, unit, is_trending, image_urls) VALUES
    (cat_id, 'Nagpur Oranges', 'nagpur-oranges-1kg', 120.00, 99.00, 40, '1kg', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39151.jpg"}'),
    (cat_id, 'Fresh Bananas (Robusta)', 'bananas-6pcs', 40.00, 35.00, 60, '6pcs', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39146.jpg"}'),
    (cat_id, 'Premium Onions', 'onions-1kg', 35.00, 28.00, 500, '1kg', true, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39155.jpg"}'),
    (cat_id, 'New Potato (Aloo)', 'potato-1kg', 40.00, 32.00, 400, '1kg', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39154.jpg"}'),
    (cat_id, 'Hybrid Tomato', 'tomato-500g', 15.00, null, 300, '500g', false, '{"https://cdn.grofers.com/app/images/products/full_screen/pro_39148.jpg"}');
END $$;
