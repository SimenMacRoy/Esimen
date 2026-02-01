-- =============================================
-- COUPONS & DISCOUNTS SYSTEM
-- Comprehensive coupon management
-- =============================================

-- Main Coupons Table
CREATE TABLE IF NOT EXISTS COUPONS (
    coupon_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Discount Type
    -- 'percentage': X% off
    -- 'fixed_amount': $X off
    -- 'buy_x_get_y': Buy X items, get Y free (or at discount)
    -- 'free_shipping': Free shipping
    discount_type ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping') NOT NULL,

    -- Discount Value
    -- For percentage: the percentage (e.g., 10 for 10%)
    -- For fixed_amount: the dollar amount (e.g., 20 for $20 off)
    -- For buy_x_get_y: the percentage off the free items (100 = completely free)
    discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Buy X Get Y specific fields
    buy_quantity INT DEFAULT NULL,          -- How many items to buy
    get_quantity INT DEFAULT NULL,          -- How many items to get free/discounted

    -- Conditions
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,           -- Minimum cart total required
    max_discount_amount DECIMAL(10, 2) DEFAULT NULL,        -- Maximum discount cap (for percentage)
    min_items_in_cart INT DEFAULT 0,                        -- Minimum number of items required

    -- Restrictions
    applies_to ENUM('all', 'category', 'product', 'department') DEFAULT 'all',
    category_id INT DEFAULT NULL,           -- If applies_to = 'category'
    product_id INT DEFAULT NULL,            -- If applies_to = 'product'
    department_name VARCHAR(100) DEFAULT NULL, -- If applies_to = 'department'

    -- Customer restrictions
    new_customers_only BOOLEAN DEFAULT FALSE,   -- Only for first-time buyers

    -- Usage limits
    max_total_uses INT DEFAULT NULL,            -- Total uses allowed (NULL = unlimited)
    max_uses_per_user INT DEFAULT 1,            -- Uses per user (1 = one-time use)
    current_uses INT DEFAULT 0,                 -- Track current usage count

    -- Validity period
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Note: Foreign keys for category_id and product_id are optional
    -- They can be added later if CATEGORIES and PRODUCTS tables exist
    -- FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id) ON DELETE SET NULL,
    -- FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_coupon_code (code),
    INDEX idx_coupon_active (is_active),
    INDEX idx_coupon_dates (start_date, end_date)
);

-- Coupon Usage Tracking Table
CREATE TABLE IF NOT EXISTS COUPON_USAGE (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT DEFAULT NULL,

    -- Discount details
    original_amount DECIMAL(10, 2) NOT NULL,    -- Cart total before discount
    discount_applied DECIMAL(10, 2) NOT NULL,   -- Amount discounted
    final_amount DECIMAL(10, 2) NOT NULL,       -- Cart total after discount

    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (coupon_id) REFERENCES COUPONS(coupon_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,

    INDEX idx_usage_coupon (coupon_id),
    INDEX idx_usage_user (user_id),
    INDEX idx_usage_order (order_id)
);

-- =============================================
-- SAMPLE COUPONS (for testing)
-- =============================================

-- Example: 10% off everything
-- INSERT INTO COUPONS (code, name, description, discount_type, discount_value, start_date, end_date, created_by)
-- VALUES ('WELCOME10', 'Bienvenue 10%', '10% de rabais sur votre premiere commande', 'percentage', 10, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1);

-- Example: $20 off when you spend $100+
-- INSERT INTO COUPONS (code, name, description, discount_type, discount_value, min_purchase_amount, start_date, end_date, created_by)
-- VALUES ('SAVE20', 'Economisez $20', '$20 de rabais sur les commandes de $100+', 'fixed_amount', 20, 100, NOW(), DATE_ADD(NOW(), INTERVAL 6 MONTH), 1);

-- Example: Buy 2 Get 1 Free
-- INSERT INTO COUPONS (code, name, description, discount_type, discount_value, buy_quantity, get_quantity, start_date, end_date, created_by)
-- VALUES ('B2G1', 'Achetez 2, Obtenez 1 Gratuit', 'Achetez 2 articles, obtenez le 3eme gratuit', 'buy_x_get_y', 100, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 3 MONTH), 1);

-- Example: 15% off Femme category
-- INSERT INTO COUPONS (code, name, description, discount_type, discount_value, applies_to, department_name, start_date, end_date, created_by)
-- VALUES ('FEMME15', 'Solde Femme', '15% sur tous les articles Femme', 'percentage', 15, 'department', 'Femme', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 1);
