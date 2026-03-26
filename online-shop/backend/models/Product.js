const db = require('../config/database');

class Product {
    // 管理員查全部商品
    static async findAllForAdmin() {
        try {
            const [rows] = await db.query(`
                SELECT *,
                    (SELECT COALESCE(SUM(oi.quantity), 0)
                     FROM order_items oi
                     WHERE oi.product_id = products.id) AS sales_count
                FROM products
                ORDER BY id DESC
            `);
            return rows;
        } catch (error) {
            console.error('findAllForAdmin error:', error);
            throw error;
        }
    }

    // 前台商品列表（分類 / 搜尋 / 分頁）
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT p.*,
                       (SELECT COALESCE(SUM(oi.quantity), 0)
                        FROM order_items oi
                        WHERE oi.product_id = p.id) AS sales_count
                FROM products p
                WHERE COALESCE(p.enabled, 1) = 1
            `;
            const params = [];

            if (filters.category) {
                query += ' AND p.category = ?';
                params.push(filters.category);
            }

            if (filters.search) {
                query += `
                    AND (
                        p.name LIKE ?
                        OR p.name_en LIKE ?
                        OR p.name_zh LIKE ?
                        OR p.description LIKE ?
                    )
                `;
                const s = `%${filters.search}%`;
                params.push(s, s, s, s);
            }

            query += ' ORDER BY p.id DESC';

            if (filters.page && filters.limit) {
                const offset = (filters.page - 1) * filters.limit;
                query += ' LIMIT ? OFFSET ?';
                params.push(parseInt(filters.limit, 10), parseInt(offset, 10));
            }

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('findAll error:', error);
            throw error;
        }
    }

    // 依商品 id 取得商品
    static async findById(id) {
        const [rows] = await db.query(`
            SELECT p.*,
                   (SELECT COALESCE(SUM(oi.quantity), 0)
                    FROM order_items oi
                    WHERE oi.product_id = p.id) AS sales_count
            FROM products p
            WHERE p.id = ?
        `, [id]);
        return rows[0];
    }

    // 建立商品
    static async create(productData) {
        const { name, name_en, name_zh, price, description, image_url, category, stock } = productData;
        const [result] = await db.query(
            `INSERT INTO products
             (name, name_en, name_zh, price, description, image_url, category, stock, enabled, sales_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
            [name, name_en, name_zh, price, description, image_url, category, stock]
        );
        return { id: result.insertId, ...productData, enabled: 1, sales_count: 0 };
    }

    // 更新商品
    static async update(id, productData) {
        const { name, name_en, name_zh, price, description, image_url, category, stock, enabled } = productData;
        const [result] = await db.query(
            `UPDATE products
             SET name = ?, name_en = ?, name_zh = ?, price = ?, description = ?, image_url = ?, category = ?, stock = ?, enabled = ?
             WHERE id = ?`,
            [name, name_en, name_zh, price, description, image_url, category, stock, enabled, id]
        );
        return result.affectedRows > 0;
    }

    // 刪除商品
    static async delete(id) {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    // 訂單建立時扣庫存
    static async updateStockAndSales(productId, quantity) {
        const [result] = await db.query(
            'UPDATE products SET stock = stock - ?, sales_count = sales_count + ? WHERE id = ? AND stock >= ?',
            [quantity, quantity, productId, quantity]
        );
        return result.affectedRows > 0;
    }

    // 圖片相關
    static async getImages(productId) {
        const [rows] = await db.query(
            'SELECT id, url, created_at FROM product_images WHERE product_id = ? ORDER BY id DESC',
            [productId]
        );
        return rows;
    }

    static async getImageById(imageId, productId) {
        const [rows] = await db.query(
            'SELECT id, url FROM product_images WHERE id = ? AND product_id = ? LIMIT 1',
            [imageId, productId]
        );
        return rows[0];
    }

    static async addImages(productId, urls = []) {
        if (!urls || urls.length === 0) return false;
        const values = urls.map(url => [productId, url]);
        const [result] = await db.query(
            'INSERT INTO product_images (product_id, url) VALUES ?',
            [values]
        );
        return result.affectedRows > 0;
    }

    static async deleteImage(imageId, productId) {
        const [result] = await db.query(
            'DELETE FROM product_images WHERE id = ? AND product_id = ?',
            [imageId, productId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Product;