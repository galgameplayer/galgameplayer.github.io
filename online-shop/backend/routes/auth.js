const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const auth = require('../middleware/auth');

// A1: 用戶註冊
router.post('/register', AuthController.register);

// A2: 用戶登入
router.post('/login', AuthController.login);

// A2: 管理員登入
router.post('/admin/login', (req, res, next) => {
    req.body.isAdmin = true;
    next();
}, AuthController.login);

// A2: 獲取用戶資料（需要登入）
router.get('/profile', auth, AuthController.getProfile);

module.exports = router;