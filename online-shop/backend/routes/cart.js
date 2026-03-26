const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

// A8: 獲取購物車內容（需要登入）
router.get('/', auth, CartController.getCart);

// A7: 加入購物車（需要登入）
router.post('/', auth, CartController.addToCart);

// A9: 更新購物車商品數量（需要登入）
router.put('/:productId', auth, CartController.updateCartItem);

// A10: 從購物車移除商品（需要登入）
router.delete('/:productId', auth, CartController.removeCartItem);

// A8: 獲取購物車商品數量（需要登入）
router.get('/count', auth, CartController.getCartCount);

// A11: 清空購物車（需要登入）
router.delete('/', auth, CartController.clearCart);

module.exports = router;