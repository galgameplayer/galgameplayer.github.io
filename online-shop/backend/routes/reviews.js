const express = require('express');
const router = express.Router({ mergeParams: true });
const ReviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');

// 添加調試中間件
router.use((req, res, next) => {
    console.log(`Reviews route - ${req.method} /products/${req.params.id}/reviews${req.url}`);
    next();
});

// 獲取商品評論列表
router.get('/', ReviewController.getProductReviews);

// 檢查是否可以評論
router.get('/can-review', auth, ReviewController.canReview);

// 添加/更新評論
router.post('/', auth, ReviewController.addReview);

// 點贊/點踩
router.post('/:reviewId/like', auth, ReviewController.likeReview);

// 刪除評論
router.delete('/:reviewId', auth, ReviewController.deleteReview);

module.exports = router;