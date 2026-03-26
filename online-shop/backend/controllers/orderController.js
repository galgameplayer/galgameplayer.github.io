const db = require('../config/database');

class OrderController {
  static allowedNextStatus(current) {
    const map = {
      pending: 'processing',
      processing: 'shipped',
      shipped: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return map[current] || null;
  }

  // A11: 創建訂單（結帳）
  // B2: 訂單狀態初始化為 pending
  static async createOrder(req, res) {
    try {
      if (!req.user || req.user.type === 'admin') {
        return res.status(403).json({ error: 'Only customers can place orders' });
      }

      // 獲取購物車內容
      const [cartItems] = await db.query(
        `SELECT c.product_id, c.quantity, p.price, p.name, p.stock
         FROM cart_items c
         JOIN products p ON p.id = c.product_id
         WHERE c.user_id = ?`,
        [req.user.id]
      );

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      // 檢查庫存
      for (const item of cartItems) {
        if (item.quantity > item.stock) {
          return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
        }
      }

      // 計算總金額
      const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const now = new Date();
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const customerName = req.user.name || req.body.customerName || 'Customer';

      // 開始事務
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // 創建訂單
        const [orderResult] = await connection.query(
          `INSERT INTO orders
           (user_id, order_number, customer_name, total_amount, status, shipping_address,
            pending_at, cancellation_requested)
           VALUES (?, ?, ?, ?, 'pending', ?, ?, 0)`,
          [req.user.id, orderNumber, customerName, total, req.body.shippingAddress || req.user.address || '', now]
        );

        const orderId = orderResult.insertId;

        // 創建訂單項目
        const itemValues = cartItems.map(i => [orderId, i.product_id, i.quantity, i.price, i.name]);
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, quantity, product_price, product_name)
           VALUES ?`,
          [itemValues]
        );

        // 同時更新庫存和銷售量
        for (const item of cartItems) {
          await connection.query(
            `UPDATE products 
             SET stock = stock - ?, 
                 sales_count = sales_count + ? 
             WHERE id = ?`,
            [item.quantity, item.quantity, item.product_id]
          );
        }

        // 清空購物車
        await connection.query(`DELETE FROM cart_items WHERE user_id = ?`, [req.user.id]);

        await connection.commit();

        res.json({
          success: true,
          order_id: orderId,
          order_number: orderNumber,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // A12/A13: 獲取訂單列表（按時間倒序）
  // A19: 管理員獲取所有訂單列表
  // B3: 按訂單狀態過濾
  static async getOrders(req, res) {
    try {
      const isAdmin = req.user && req.user.type === 'admin';
      const { status } = req.query;
      let rows;

      if (isAdmin) {
        // A19: 管理員查看所有訂單
        const params = [];
        let where = '';
        if (status) {
          where = 'WHERE o.status = ?';
          params.push(status);
        }

        [rows] = await db.query(
          `SELECT o.*,
                  u.name AS customer_name,
                  u.email AS customer_email,
                  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
             FROM orders o
             JOIN users u ON u.id = o.user_id
             ${where}
         ORDER BY o.id DESC`,
          params
        );
      } else {
        // A12: 客戶查看自己的訂單
        const params = [req.user.id];
        let where = 'WHERE o.user_id = ?';
        if (status) {
          where += ' AND o.status = ?';
          params.push(status);
        }

        [rows] = await db.query(
          `SELECT o.*,
                  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
             FROM orders o
             ${where}
         ORDER BY o.id DESC`,
          params
        );
      }

      const orders = (rows || []).map(r => ({
        ...r,
        cancel_request_status: r.cancellation_requested ? 'requested' : 'none',
      }));

      res.json({ success: true, orders });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // A13/A20: 獲取單個訂單詳情
  // B4: 顯示訂單狀態時間
  static async getOrder(req, res) {
    try {
      const isAdmin = req.user && req.user.type === 'admin';
      const orderId = req.params.id;

      // A13: 查詢訂單主資訊
      const [orders] = await db.query(
        `SELECT o.*, u.name AS customer_name, u.email AS customer_email
           FROM orders o
           JOIN users u ON u.id = o.user_id
          WHERE o.id = ?`,
        [orderId]
      );

      if (!orders || orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orders[0];

      // 權限檢查：只能看自己的訂單
      if (!isAdmin && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to view this order' });
      }

      // A13: 查詢訂單項目（帶出多語名稱）
      const [items] = await db.query(
        `SELECT oi.*,
                p.image_url,
                p.name_en,
                p.name_zh
           FROM order_items oi
           LEFT JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
        [orderId]
      );

      // B4: 記錄各狀態的時間
      order.status_dates = {
        pending_at: order.pending_at,
        processing_at: order.processing_at,
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at,
        cancelled_at: order.cancelled_at,
      };

      order.cancel_request_status = order.cancellation_requested ? 'requested' : 'none';
      order.cancel_request_reason = order.cancellation_reason || null;

      // 附加 items
      order.items = items || [];

      res.json({ success: true, order });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // A20/B2: 更新訂單狀態（管理員功能）
  static async updateStatus(req, res) {
    try {
      if (!req.user || req.user.type !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const orderId = req.params.id;
      const { status, action } = req.body;

      const [orders] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
      if (!orders || orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      if (action === 'approve_cancel') {
        if (!order.cancellation_requested) {
          return res.status(400).json({ error: 'No pending cancel request' });
        }
        if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
          return res.status(400).json({ error: 'Cannot cancel at current status' });
        }

        const now = new Date();
        await db.query(
          `UPDATE orders
              SET status = 'cancelled',
                  cancelled_at = ?,
                  cancellation_requested = 0
            WHERE id = ?`,
          [now, orderId]
        );

        return res.json({
          success: true,
          status: 'cancelled',
          cancellation_requested: 0,
          cancel_request_status: 'approved',
        });
      }

      if (action === 'reject_cancel') {
        if (!order.cancellation_requested) {
          return res.status(400).json({ error: 'No pending cancel request' });
        }
        await db.query(
          `UPDATE orders
              SET cancellation_requested = 0
            WHERE id = ?`,
          [orderId]
        );

        return res.json({
          success: true,
          status: order.status,
          cancellation_requested: 0,
          cancel_request_status: 'rejected',
        });
      }

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      if (status === 'cancelled') {
        return res.status(400).json({ error: 'Cancelled can only be set via cancel approval' });
      }

      const next = OrderController.allowedNextStatus(order.status);
      if (!next || next !== status) {
        return res.status(400).json({ error: `Invalid transition from ${order.status} to ${status}` });
      }

      const now = new Date();
      const timeField = `${status}_at`;

      await db.query(
        `UPDATE orders
            SET status = ?,
                ${timeField} = ?
          WHERE id = ?`,
        [status, now, orderId]
      );

      res.json({ success: true, status });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // B2: 客戶請求取消訂單
  static async requestCancel(req, res) {
    try {
      if (!req.user || req.user.type === 'admin') {
        return res.status(403).json({ error: 'Only customers can request cancellation' });
      }

      const orderId = req.params.id;
      const { reason = '' } = req.body;

      const [orders] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
      if (!orders || orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      if (order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized for this order' });
      }

      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        return res.status(400).json({ error: 'Cannot request cancellation at current status' });
      }

      if (order.cancellation_requested) {
        return res.status(400).json({ error: 'Cancellation already requested' });
      }

      await db.query(
        `UPDATE orders
            SET cancellation_requested = 1,
                cancellation_reason = ?
          WHERE id = ?`,
        [reason, orderId]
      );

      res.json({
        success: true,
        cancellation_requested: 1,
        cancel_request_status: 'requested',
      });
    } catch (error) {
      console.error('Request cancel error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }
}

module.exports = OrderController;