-- Migration: Add Marketing Slogans for Push Notifications
CREATE TABLE marketing_slogans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed with some initial catchy slogans
INSERT INTO marketing_slogans (title, body, image_url) VALUES
('Comfort Food? We Got You!', 'Order your favorite snacks and essentials now. Fast delivery in 10 mins!', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop'),
('Beat the Heat! 🍦', 'Chilled ice creams and beverages delivered to your doorstep.', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?q=80&w=2070&auto=format&fit=crop'),
('Maggi Night? 🍜', 'Stock up on your midnight cravings. Quick delivery, fresh items.', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?q=80&w=2070&auto=format&fit=crop');
