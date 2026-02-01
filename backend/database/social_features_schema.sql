-- =============================================
-- SOCIAL FEATURES SCHEMA
-- Comments, Likes, and Audit Trail
-- =============================================

-- Product Comments Table
CREATE TABLE IF NOT EXISTS PRODUCT_COMMENTS (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    INDEX idx_product_comments (product_id),
    INDEX idx_user_comments (user_id)
);

-- Product Likes/Dislikes Table
CREATE TABLE IF NOT EXISTS PRODUCT_LIKES (
    like_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    is_like TINYINT(1) NOT NULL DEFAULT 1,  -- 1 = like, 0 = dislike
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product_like (product_id, user_id),
    INDEX idx_product_likes (product_id)
);

-- Product Audit Trail Table (Admin actions)
CREATE TABLE IF NOT EXISTS PRODUCT_AUDIT (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    admin_id INT NULL,
    action_type ENUM('created', 'modified', 'deleted') NOT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_name VARCHAR(255),
    details TEXT,
    FOREIGN KEY (admin_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    INDEX idx_product_audit (product_id),
    INDEX idx_admin_audit (admin_id)
);

-- Add column to track like counts for faster sorting (optional optimization)
-- These will error if columns already exist, which is fine
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PRODUCTS' AND COLUMN_NAME = 'like_count') = 0,
    'ALTER TABLE PRODUCTS ADD COLUMN like_count INT DEFAULT 0',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PRODUCTS' AND COLUMN_NAME = 'dislike_count') = 0,
    'ALTER TABLE PRODUCTS ADD COLUMN dislike_count INT DEFAULT 0',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
