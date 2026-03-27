CREATE DATABASE IF NOT EXISTS online_shop;
USE online_shop;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    type ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) DEFAULT NULL,
    name_zh VARCHAR(100) DEFAULT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    category VARCHAR(50),
    stock INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_enabled (enabled),
    INDEX idx_name_en (name_en),
    INDEX idx_name_zh (name_zh)
);

CREATE TABLE IF NOT EXISTS product_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (user_id, product_id),
    INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pending_at DATETIME NULL DEFAULT NULL,
    processing_at DATETIME NULL DEFAULT NULL,
    shipped_at DATETIME NULL DEFAULT NULL,
    delivered_at DATETIME NULL DEFAULT NULL,
    cancelled_at DATETIME NULL DEFAULT NULL,
    refunded_at DATETIME NULL DEFAULT NULL,
    cancellation_requested TINYINT(1) DEFAULT 0,
    cancellation_reason TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

USE online_shop;

CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order_id (order_id)
);

CREATE TABLE IF NOT EXISTS product_ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT,
    likes_count INT DEFAULT 0,
    dislikes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_product_user (product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS review_likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    review_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('like', 'dislike') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_review_user (review_id, user_id),
    FOREIGN KEY (review_id) REFERENCES product_ratings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_review_id (review_id),
    INDEX idx_user_id (user_id)
);

-- 預設帳號
INSERT IGNORE INTO users (email, password, name, type) VALUES 
('admin@shop.com', 'admin123', 'Admin User', 'admin'),
('customer@example.com', 'admin123', 'John Customer', 'customer');

-- 商品資料：同時填入中英文名稱；舊 name 欄位保留為英文名
INSERT IGNORE INTO products (name, name_en, name_zh, price, description, image_url, category, stock, sales_count) VALUES
('Doraemon', 'Doraemon', '哆啦A梦', 899.99, 'This is DORAEMON''s badge.', '/images/1.jpg', 'Doraemon', 45, 0),
('Nobita', 'Nobita', '大雄', 899.99, 'This is NOBITA''s badge.', '/images/2.jpg', 'Doraemon', 45, 0),
('Shizuka', 'Shizuka', '静香', 899.99, 'This is SHIZUKA''s badge.', '/images/3.jpg', 'Doraemon', 45, 0),
('Takeshi', 'Takeshi', '胖虎', 899.99, 'This is TAKESHI''s badge.', '/images/4.jpg', 'Doraemon', 45, 0),
('Dorami', 'Dorami', '哆啦美', 899.99, 'This is DORAMI''s badge.', '/images/5.jpg', 'Doraemon', 45, 0),
('Madoka', 'Madoka', '鹿目圆', 699.99, 'This is MADOKA''s badge.', '/images/6.jpg', 'Madoka Magica', 45, 0),
('Homura', 'Homura', '晓美焰', 699.99, 'This is HOMURA''s badge.', '/images/7.jpg', 'Madoka Magica', 45, 0),
('Mami', 'Mami', '巴麻美', 699.99, 'This is MAMI''s badge.', '/images/8.jpg', 'Madoka Magica', 45, 0),
('Kyoko', 'Kyoko', '佐仓杏子', 699.99, 'This is KYOKO''s badge.', '/images/9.jpg', 'Madoka Magica', 45, 0),
('Sayaka', 'Sayaka', '美树沙耶加', 699.99, 'This is SAYAKA''s badge.', '/images/10.jpg', 'Madoka Magica', 45, 0),
('Pochita', 'Pochita', '波奇塔', 799.99, 'This is POCHITA''s badge.', '/images/11.jpg', 'Chainsaw Man', 45, 0),
('Denji', 'Denji', '电次', 799.99, 'This is DENJI''s badge.', '/images/12.jpg', 'Chainsaw Man', 45, 0),
('Makima', 'Makima', '玛奇玛', 799.99, 'This is MAKIMA''s badge.', '/images/13.jpg', 'Chainsaw Man', 45, 0),
('Aki', 'Aki', '早川秋', 799.99, 'This is AKI''s badge.', '/images/14.jpg', 'Chainsaw Man', 45, 0),
('Power', 'Power', '帕瓦', 799.99, 'This is POWER''s badge.', '/images/15.jpg', 'Chainsaw Man', 45, 0);