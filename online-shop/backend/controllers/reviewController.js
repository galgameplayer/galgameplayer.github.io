const Review = require('../models/Review');
const db = require('../config/database');

class ReviewController {
    // 獲取商品評論列表
    static async getProductReviews(req, res) {
        try {
            const productId = req.params.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const sortBy = req.query.sort || 'newest';
            const userId = req.user ? req.user.id : null;

            // 檢查商品是否存在
            const [product] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
            if (!product || product.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const result = await Review.getProductReviews(productId, page, limit, sortBy, userId);
            
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Get product reviews error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 點贊/點踩評論
    static async likeReview(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Please login first' });
            }

            const reviewId = req.params.reviewId;
            const { type } = req.body;  // 'like' 或 'dislike'

            if (!['like', 'dislike'].includes(type)) {
                return res.status(400).json({ error: 'Invalid type' });
            }

            const result = await Review.likeReview(reviewId, req.user.id, type);

            // 獲取用戶當前的點贊狀態
            const [userLike] = await db.query(
                'SELECT type FROM review_likes WHERE review_id = ? AND user_id = ?',
                [reviewId, req.user.id]
            );

            res.json({
                success: true,
                likes: result.likes_count,
                dislikes: result.dislikes_count,
                user_like_type: userLike.length > 0 ? userLike[0].type : null
            });

        } catch (error) {
            console.error('Like review error:', error);
            
            if (error.code === 'ER_LOCK_DEADLOCK') {
                return res.status(503).json({ 
                    error: 'System busy, please try again',
                    retry: true 
                });
            }
            
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 添加或更新評論
    static async addReview(req, res) {
        try {
            if (!req.user || req.user.type === 'admin') {
                return res.status(403).json({ error: 'Only customers can add reviews' });
            }

            const productId = req.params.id;
            const { rating, comment } = req.body;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ error: 'Rating must be between 1 and 5' });
            }

            if (!comment || comment.trim().length < 5) {
                return res.status(400).json({ error: 'Comment must be at least 5 characters' });
            }

            const [product] = await db.query(
                'SELECT id, enabled FROM products WHERE id = ?',
                [productId]
            );
            if (!product || product.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (product[0].enabled === 0) {
                return res.status(400).json({ error: 'Product is disabled' });
            }

            // 檢查用戶已購買且已送達
            const [purchased] = await db.query(
                `SELECT COUNT(*) as count
                 FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 WHERE o.user_id = ? 
                   AND oi.product_id = ? 
                   AND o.status = 'delivered'`,
                [req.user.id, productId]
            );

            if (purchased[0].count === 0) {
                return res.status(400).json({ 
                    error: 'You can only review products after they have been delivered' 
                });
            }

            const result = await Review.createOrUpdate(productId, req.user.id, rating, comment);
            const ratingInfo = await Review.getProductRating(productId);

            res.json({
                success: true,
                message: result.created ? 'Review added successfully' : 'Review updated successfully',
                rating: ratingInfo,
                review: {
                    rating,
                    comment,
                    created_at: new Date()
                }
            });
        } catch (error) {
            console.error('Add review error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 刪除評論（僅作者本人）
    static async deleteReview(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Please login first' });
            }

            const reviewId = req.params.reviewId;
            const productId = req.params.id;

            const [review] = await db.query(
                'SELECT * FROM product_ratings WHERE id = ?',
                [reviewId]
            );

            if (!review || review.length === 0) {
                return res.status(404).json({ error: 'Review not found' });
            }

            const isOwner = review[0].user_id === req.user.id;
            if (!isOwner) {
                return res.status(403).json({ error: 'Not authorized to delete this review' });
            }

            const deleted = await Review.delete(reviewId, req.user.id);
            if (!deleted) {
                return res.status(404).json({ error: 'Review not found' });
            }

            const ratingInfo = await Review.getProductRating(productId);

            res.json({
                success: true,
                message: 'Review deleted successfully',
                rating: ratingInfo
            });
        } catch (error) {
            console.error('Delete review error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 檢查用戶是否可以評論
    static async canReview(req, res) {
        try {
            if (!req.user || req.user.type === 'admin') {
                return res.json({ canReview: false, reason: 'Only customers can review' });
            }

            const productId = req.params.id;

            const [purchased] = await db.query(
                `SELECT COUNT(*) as count
                 FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 WHERE o.user_id = ? 
                   AND oi.product_id = ? 
                   AND o.status = 'delivered'`,
                [req.user.id, productId]
            );

            if (purchased[0].count === 0) {
                return res.json({ 
                    canReview: false, 
                    reason: 'You can only review products after they have been delivered' 
                });
            }

            const existingReview = await Review.getUserReview(productId, req.user.id);

            res.json({
                canReview: true,
                hasExistingReview: !!existingReview,
                existingReview: existingReview || null
            });
        } catch (error) {
            console.error('Can review error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
}

module.exports = ReviewController;