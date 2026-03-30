const db = require('../config/database');

class Review {
    static async getProductReviews(productId, page = 1, limit = 10, sortBy = 'newest', userId = null) {
        try {
            const offset = (page - 1) * limit;
            
            let orderBy = 'r.created_at DESC';
            if (sortBy === 'most_liked') {
                orderBy = 'r.likes_count DESC, r.created_at DESC';
            }
            
            let query = `
                SELECT r.*, u.name as user_name, u.email as user_email,
                       r.likes_count, r.dislikes_count
            `;
            
            const params = [productId];
            
            if (userId) {
                query += `, (SELECT type FROM review_likes WHERE review_id = r.id AND user_id = ?) AS user_like_type`;
                params.push(userId);
            }
            
            query += `
                FROM product_ratings r
                JOIN users u ON u.id = r.user_id
                WHERE r.product_id = ?
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `;
            
            params.push(limit, offset);
            
            const [rows] = await db.query(query, params);
            
            const [countResult] = await db.query(
                'SELECT COUNT(*) as total FROM product_ratings WHERE product_id = ?',
                [productId]
            );
            
            return {
                reviews: rows,
                total: countResult[0].total,
                page,
                limit,
                pages: Math.ceil(countResult[0].total / limit)
            };
        } catch (error) {
            console.error('getProductReviews error:', error);
            throw error;
        }
    }

    static async getUserReview(productId, userId) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM product_ratings WHERE product_id = ? AND user_id = ?',
                [productId, userId]
            );
            return rows[0];
        } catch (error) {
            console.error('getUserReview error:', error);
            throw error;
        }
    }

    static async createOrUpdate(productId, userId, rating, comment) {
        try {
            const [existing] = await db.query(
                'SELECT id FROM product_ratings WHERE product_id = ? AND user_id = ?',
                [productId, userId]
            );

            if (existing.length > 0) {
                await db.query(
                    'UPDATE product_ratings SET rating = ?, comment = ? WHERE product_id = ? AND user_id = ?',
                    [rating, comment, productId, userId]
                );
                return { updated: true };
            } else {
                const [result] = await db.query(
                    'INSERT INTO product_ratings (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
                    [productId, userId, rating, comment]
                );
                return { id: result.insertId, created: true };
            }
        } catch (error) {
            console.error('createOrUpdate error:', error);
            throw error;
        }
    }

    static async delete(reviewId, userId) {
        try {
            const [result] = await db.query(
                'DELETE FROM product_ratings WHERE id = ? AND user_id = ?',
                [reviewId, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('delete error:', error);
            throw error;
        }
    }

    static async getProductRating(productId) {
        try {
            const [rows] = await db.query(
                'SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as rating_count FROM product_ratings WHERE product_id = ?',
                [productId]
            );
            return {
                avg_rating: rows[0].avg_rating || 0,
                rating_count: rows[0].rating_count || 0
            };
        } catch (error) {
            console.error('getProductRating error:', error);
            throw error;
        }
    }

    static async likeReview(reviewId, userId, type) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [review] = await connection.query(
                'SELECT * FROM product_ratings WHERE id = ? FOR UPDATE',
                [reviewId]
            );
            
            if (!review || review.length === 0) {
                throw new Error('Review not found');
            }
            
            const [existing] = await connection.query(
                'SELECT type FROM review_likes WHERE review_id = ? AND user_id = ?',
                [reviewId, userId]
            );
            
            let likesChange = 0;
            let dislikesChange = 0;
            
            if (existing.length > 0) {
                const oldType = existing[0].type;
                
                if (oldType === type) {
                    await connection.query(
                        'DELETE FROM review_likes WHERE review_id = ? AND user_id = ?',
                        [reviewId, userId]
                    );
                    
                    if (type === 'like') likesChange = -1;
                    else dislikesChange = -1;
                } else {
                    await connection.query(
                        'UPDATE review_likes SET type = ? WHERE review_id = ? AND user_id = ?',
                        [type, reviewId, userId]
                    );
                    
                    if (oldType === 'like' && type === 'dislike') {
                        likesChange = -1;
                        dislikesChange = 1;
                    } else if (oldType === 'dislike' && type === 'like') {
                        likesChange = 1;
                        dislikesChange = -1;
                    }
                }
            } else {
                await connection.query(
                    'INSERT INTO review_likes (review_id, user_id, type) VALUES (?, ?, ?)',
                    [reviewId, userId, type]
                );
                
                if (type === 'like') likesChange = 1;
                else dislikesChange = 1;
            }
            
            if (likesChange !== 0 || dislikesChange !== 0) {
                await connection.query(
                    `UPDATE product_ratings 
                     SET likes_count = likes_count + ?, 
                         dislikes_count = dislikes_count + ? 
                     WHERE id = ?`,
                    [likesChange, dislikesChange, reviewId]
                );
            }
            
            await connection.commit();
            
            const [updated] = await connection.query(
                'SELECT likes_count, dislikes_count FROM product_ratings WHERE id = ?',
                [reviewId]
            );
            
            return updated[0];
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Review;