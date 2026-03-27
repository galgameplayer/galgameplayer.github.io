const db = require('../config/database');

class Order {
    // A11: 創建訂單
    static async create(orderData) {
        const { order_number, user_id, customer_name, total_amount, shipping_address, items } = orderData;

        if (!customer_name) {
            throw new Error('Customer name is required');
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // A11/B2: 插入訂單主表（狀態為 pending）
            const [orderResult] = await connection.query(
                `INSERT INTO orders 
                 (order_number, user_id, customer_name, total_amount, shipping_address, status, pending_at) 
                 VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
                [order_number, user_id, customer_name, total_amount, shipping_address]
            );

            const orderId = orderResult.insertId;

            // A13: 插入訂單項目
            for (const item of items) {
                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity) VALUES (?, ?, ?, ?, ?)',
                    [orderId, item.productId, item.name, item.price, item.quantity]
                );
            }

            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // A12: 根據用戶ID查詢訂單
    static async findByUserId(userId) {
        try {
            const query = `
                SELECT o.*, 
                       (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
                FROM orders o 
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC
            `;
            const [rows] = await db.query(query, [userId]);
            return rows || [];
        } catch (error) {
            console.error('findByUserId error:', error);
            throw error;
        }
    }

    // A13/A20: 根據訂單ID查詢訂單詳情（包括訂單項目）
    static async findById(orderId) {
        try {
            const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

            if (orders.length === 0) {
                return null;
            }

            const order = orders[0];

            // A13: 查詢訂單項目
            const [items] = await db.query(
                'SELECT * FROM order_items WHERE order_id = ?',
                [orderId]
            );

            order.items = items;
            return order;
        } catch (error) {
            console.error('findById error:', error);
            throw error;
        }
    }

    // A19: 查詢所有訂單（可過濾狀態）
    static async findAll(filters = {}) {
        try {
            let query = 'SELECT * FROM orders';
            const params = [];

            // B3: 按狀態過濾
            if (filters.status) {
                query += ' WHERE status = ?';
                params.push(filters.status);
            }

            query += ' ORDER BY created_at DESC';

            const [rows] = await db.query(query, params);
            return rows || [];
        } catch (error) {
            console.error('findAll error:', error);
            throw error;
        }
    }

    // B2/B4: 更新訂單狀態（記錄時間戳）
    static async updateStatus(orderId, status) {
        const columnMap = {
            pending: 'pending_at',
            processing: 'processing_at',
            shipped: 'shipped_at',
            delivered: 'delivered_at',
            cancelled: 'cancelled_at',
            refunded: 'refunded_at'
        };
        const tsColumn = columnMap[status] || null;

        if (tsColumn) {
            // B4: 更新狀態並記錄時間
            const [result] = await db.query(
                `UPDATE orders 
                 SET status = ?, ${tsColumn} = IFNULL(${tsColumn}, NOW()) 
                 WHERE id = ?`,
                [status, orderId]
            );
            return result.affectedRows > 0;
        } else {
            const [result] = await db.query(
                'UPDATE orders SET status = ? WHERE id = ?',
                [status, orderId]
            );
            return result.affectedRows > 0;
        }
    }
}

module.exports = Order;