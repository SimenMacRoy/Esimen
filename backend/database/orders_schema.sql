-- ============================================
-- ORDERS TABLES - Shek's House
-- ============================================

-- Table des commandes
CREATE TABLE IF NOT EXISTS ORDERS (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'confirmed',
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    taxes DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    delivery_address VARCHAR(255),
    delivery_city VARCHAR(100),
    delivery_province VARCHAR(50),
    delivery_postal VARCHAR(20),
    promo_code VARCHAR(50),
    stripe_payment_intent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- Table des articles de commande
CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE SET NULL
);

-- Index pour améliorer les performances
CREATE INDEX idx_orders_user_id ON ORDERS(user_id);
CREATE INDEX idx_orders_status ON ORDERS(status);
CREATE INDEX idx_orders_created_at ON ORDERS(created_at);
CREATE INDEX idx_order_items_order_id ON ORDER_ITEMS(order_id);


UPDATE USERS SET is_admin = 1 WHERE email = 'macroysimen@example.com';
