const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const ProductController = require('../controllers/productController');
const auth = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
        cb(null, `${Date.now()}_${base}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 30 }
});

// A3/A4/A5/A14: 獲取商品列表（支援搜尋、分頁、ID搜尋）
router.get('/', auth, ProductController.getProducts);

// A6: 獲取商品詳情
router.get('/:id', auth, ProductController.getProduct);

// T: 商品評分
router.post('/:id/rating', auth, ProductController.rateProduct);

// A16: 新增商品
router.post('/', auth, ProductController.createProduct);

// A17: 編輯商品
router.put('/:id', auth, ProductController.updateProduct);

// 刪除商品（管理員功能）
router.delete('/:id', auth, ProductController.deleteProduct);

// A18: 啟用/禁用商品
router.put('/:id/toggle', auth, ProductController.toggleProduct);

// B1: 上傳商品圖片
router.post('/:id/images', auth, upload.array('images', 30), ProductController.uploadImages);

// B1: 刪除商品圖片
router.delete('/:id/images/:imageId', auth, ProductController.deleteImage);

// T: 評論路由
const reviewRoutes = require('./reviews');
router.use('/:id/reviews', reviewRoutes);

module.exports = router;