const db = require('../config/database');

class Cart {
    // 取得購物車內容（含中英文名）
    static async findByUserId(userId) {
        const [rows] = await db.query(
            `SELECT ci.*, p.name, p.name_en, p.name_zh, p.price, p.image_url, p.stock
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.user_id = ?`,
            [userId]
        );
        return rows;
    }

    // 加入購物車
    static async addItem(userId, productId, quantity = 1) {
        const [existing] = await db.query(
            'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        if (existing.length > 0) {
            const [result] = await db.query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity, userId, productId]
            );
            return result.affectedRows > 0;
        } else {
            const [result] = await db.query(
                'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [userId, productId, quantity]
            );
            return result.affectedRows > 0;
        }
    }

    // 更新數量
    static async updateQuantity(userId, productId, quantity) {
        if (quantity <= 0) {
            return this.removeItem(userId, productId);
        }
        const [result] = await db.query(
            'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
            [quantity, userId, productId]
        );
        return result.affectedRows > 0;
    }

    // 移除
    static async removeItem(userId, productId) {
        const [result] = await db.query(
            'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );
        return result.affectedRows > 0;
    }

    // 清空
    static async clearCart(userId) {
        const [result] = await db.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
        return result.affectedRows > 0;
    }

    // 總數
    static async getCartCount(userId) {
        const [rows] = await db.query(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?',
            [userId]
        );
        return rows[0].count || 0;
    }
}

module.exports = Cart;