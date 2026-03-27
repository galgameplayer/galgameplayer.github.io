require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');

const app = express();

// 中間件配置
app.use(cors());                                // 啟用 CORS
app.use(express.json());                        // 解析 JSON 請求體
app.use(express.urlencoded({ extended: true })); // 解析表單數據

// 靜態文件服務
app.use(express.static(path.join(__dirname, '../frontend'))); // 前端文件

// API 路由
app.use('/api/auth', authRoutes);      // 認證相關 API
app.use('/api/products', productRoutes); // 商品相關 API
app.use('/api/cart', cartRoutes);      // 購物車相關 API
app.use('/api/orders', orderRoutes);   // 訂單相關 API

// 上傳文件服務
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康檢查端點
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 前端路由處理（SPA支援）
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 啟動服務器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});