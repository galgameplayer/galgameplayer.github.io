const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// A11: 創建訂單（需要登入）
router.post('/', auth, OrderController.createOrder);

// A12/A19/B3: 獲取訂單列表
router.get('/', auth, OrderController.getOrders);

// A13/A20: 獲取訂單詳情
router.get('/:id', auth, OrderController.getOrder);

// A20/B2: 更新訂單狀態（管理員功能）
router.put('/:id/status', auth, OrderController.updateStatus);

// B2: 客戶請求取消訂單
router.put('/:id/cancel-request', auth, OrderController.requestCancel);

module.exports = router;