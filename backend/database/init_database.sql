-- =============================================
-- SHEK'S HOUSE - COMPLETE DATABASE SCHEMA
-- Execute this script to initialize all tables
-- =============================================

-- =============================================
-- 1. BASE TABLES (Must be created first)
-- =============================================

-- Users Table
CREATE TABLE IF NOT EXISTS USERS (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    postal_address VARCHAR(255),
    profile_picture VARCHAR(255) DEFAULT NULL,
    is_admin TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments Table
CREATE TABLE IF NOT EXISTS DEPARTMENT (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL
);

-- Categories Table
CREATE TABLE IF NOT EXISTS CATEGORY (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

-- Department-Category Link Table
CREATE TABLE IF NOT EXISTS DEPARTMENT_CATEGORY (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    category_id INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id) ON DELETE CASCADE,
    UNIQUE KEY unique_dept_cat (department_id, category_id)
);

-- Products Table
CREATE TABLE IF NOT EXISTS PRODUCTS (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    department_id INT,
    category_id INT,
    like_count INT DEFAULT 0,
    dislike_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id) ON DELETE SET NULL
);

-- Product Images Table
CREATE TABLE IF NOT EXISTS PRODUCT_IMAGES (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE
);

-- Basket Table
CREATE TABLE IF NOT EXISTS BASKET (
    basket_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- =============================================
-- 2. ORDERS TABLES
-- =============================================

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

-- =============================================
-- 3. SOCIAL FEATURES TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS PRODUCT_COMMENTS (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PRODUCT_LIKES (
    like_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    is_like TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product_like (product_id, user_id)
);

CREATE TABLE IF NOT EXISTS PRODUCT_AUDIT (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    admin_id INT NULL,
    action_type ENUM('created', 'modified', 'deleted') NOT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_name VARCHAR(255),
    details TEXT,
    FOREIGN KEY (admin_id) REFERENCES USERS(user_id) ON DELETE SET NULL
);

-- =============================================
-- 4. COUPONS TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS COUPONS (
    coupon_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    buy_quantity INT DEFAULT NULL,
    get_quantity INT DEFAULT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) DEFAULT NULL,
    min_items_in_cart INT DEFAULT 0,
    applies_to ENUM('all', 'category', 'product', 'department') DEFAULT 'all',
    category_id INT DEFAULT NULL,
    product_id INT DEFAULT NULL,
    department_name VARCHAR(100) DEFAULT NULL,
    new_customers_only BOOLEAN DEFAULT FALSE,
    max_total_uses INT DEFAULT NULL,
    max_uses_per_user INT DEFAULT 1,
    current_uses INT DEFAULT 0,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS COUPON_USAGE (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT DEFAULT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES COUPONS(coupon_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- =============================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_products_dept ON PRODUCTS(department_id);
CREATE INDEX IF NOT EXISTS idx_products_cat ON PRODUCTS(category_id);
CREATE INDEX IF NOT EXISTS idx_basket_user ON BASKET(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON ORDERS(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON ORDERS(status);

-- =============================================
-- 6. DEFAULT DATA
-- =============================================

-- Default departments
INSERT IGNORE INTO DEPARTMENT (department_name) VALUES
    ('Femme'),
    ('Homme'),
    ('Enfant'),
    ('Maison');

-- Default categories
INSERT IGNORE INTO CATEGORY (category_name) VALUES
    ('Robes'),
    ('Pantalons'),
    ('Chemises'),
    ('Chaussures'),
    ('Accessoires'),
    ('T-shirts'),
    ('Vestes'),
    ('Jupes');

-- Link departments to categories
INSERT IGNORE INTO DEPARTMENT_CATEGORY (department_id, category_id)
SELECT d.department_id, c.category_id
FROM DEPARTMENT d, CATEGORY c
WHERE d.department_name IN ('Femme', 'Homme')
AND c.category_name IN ('Pantalons', 'Chemises', 'Chaussures', 'Accessoires', 'T-shirts', 'Vestes');

INSERT IGNORE INTO DEPARTMENT_CATEGORY (department_id, category_id)
SELECT d.department_id, c.category_id
FROM DEPARTMENT d, CATEGORY c
WHERE d.department_name = 'Femme'
AND c.category_name IN ('Robes', 'Jupes');

-- =============================================
-- DONE! Database initialized successfully.
-- =============================================
