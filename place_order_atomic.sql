CREATE OR REPLACE FUNCTION place_order_atomic(
    p_user_id UUID,
    p_total_amount DECIMAL,
    p_address TEXT,
    p_delivery_date TEXT DEFAULT NULL,
    p_delivery_time_slot TEXT DEFAULT NULL,
    p_coupon_code TEXT DEFAULT NULL,
    p_discount_amount DECIMAL DEFAULT 0,
    p_payment_method TEXT DEFAULT 'COD',
    p_items JSONB DEFAULT '[]'::JSONB
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_product_id UUID;
    v_quantity INTEGER;
    v_current_stock INTEGER;
BEGIN
    -- 1. Create the order
    INSERT INTO orders (
        user_id, 
        total_amount, 
        delivery_address, 
        delivery_date, 
        delivery_time_slot, 
        coupon_code, 
        discount_amount, 
        payment_method, 
        status
    ) VALUES (
        p_user_id, 
        p_total_amount, 
        p_address, 
        p_delivery_date::DATE, 
        p_delivery_time_slot, 
        p_coupon_code, 
        p_discount_amount, 
        p_payment_method, 
        'pending'
    ) RETURNING id INTO v_order_id;

    -- 2. Process items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER) LOOP
        v_product_id := v_item.product_id;
        v_quantity := v_item.quantity;

        -- Check and update stock (Atomic)
        UPDATE products 
        SET stock_quantity = stock_quantity - v_quantity 
        WHERE id = v_product_id AND stock_quantity >= v_quantity
        RETURNING stock_quantity INTO v_current_stock;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
        END IF;

        -- Insert order item (Trigger will handle price_at_time and updating order total if needed, 
        -- but here we rely on the passed p_total_amount for the parent order)
        INSERT INTO order_items (order_id, product_id, quantity)
        VALUES (v_order_id, v_product_id, v_quantity);
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
