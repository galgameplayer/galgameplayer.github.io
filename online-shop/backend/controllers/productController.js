const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');

class ProductController {
    static normalizeSort(raw) {
        if (!raw) return 'newest';
        const s = String(raw).toLowerCase().replace(/[:\s_\-]/g, '');
        if (['newest', 'newestfirst', 'latest', 'default'].includes(s)) return 'newest';
        if (['priceasc', 'pricelowtohigh', 'pricelowhigh', 'lowtohigh', 'asc'].includes(s)) return 'price_asc';
        if (['pricedesc', 'pricehightolow', 'pricehighlow', 'hightolow', 'desc'].includes(s)) return 'price_desc';
        if (['ratingdesc', 'ratinghightolow', 'toprated', 'bestrated'].includes(s)) return 'rating_desc';
        return 'newest';
    }

    // 取得商品列表
    static async getProducts(req, res) {
        try {
            const db = require('../config/database');
            const isAdmin = req.user && req.user.type === 'admin';

            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = isAdmin ? 20 : 8;
            const offset = (page - 1) * limit;

            const category = (req.query.category || '').trim();
            const search = (req.query.search || '').trim();
            const sortRaw = req.query.sort || 'newest';
            const sort = ProductController.normalizeSort(sortRaw);

            let query = '';
            let countQuery = '';
            const params = [];
            const countParams = [];
            let hasMainWhere = false;
            let hasMainWhereCount = false;

            if (isAdmin) {
                query = `
                    SELECT p.*,
                        (SELECT ROUND(AVG(r.rating),1) FROM product_ratings r WHERE r.product_id = p.id) AS avg_rating,
                        (SELECT COUNT(*) FROM product_ratings r WHERE r.product_id = p.id) AS rating_count,
                        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.product_id = p.id) AS sales_count
                    FROM products p
                `;
                countQuery = 'SELECT COUNT(*) as total FROM products p';
            } else {
                query = `
                    SELECT p.*,
                        (SELECT ROUND(AVG(r.rating),1) FROM product_ratings r WHERE r.product_id = p.id) AS avg_rating,
                        (SELECT COUNT(*) FROM product_ratings r WHERE r.product_id = p.id) AS rating_count,
                        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.product_id = p.id) AS sales_count
                    FROM products p
                    WHERE p.enabled = 1
                `;
                countQuery = 'SELECT COUNT(*) as total FROM products p WHERE p.enabled = 1';
                hasMainWhere = true;
                hasMainWhereCount = true;
            }

            // 分類
            if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'all categories') {
                if (hasMainWhere) {
                    query += ' AND p.category = ?';
                } else {
                    query += ' WHERE p.category = ?';
                    hasMainWhere = true;
                }
                if (hasMainWhereCount) {
                    countQuery += ' AND p.category = ?';
                } else {
                    countQuery += ' WHERE p.category = ?';
                    hasMainWhereCount = true;
                }
                params.push(category);
                countParams.push(category);
            }

            // 搜尋 (名稱中英文 + 描述 + ID)
            if (search) {
                const searchCondition = '(p.name LIKE ? OR p.name_en LIKE ? OR p.name_zh LIKE ? OR p.description LIKE ? OR CAST(p.id AS CHAR) LIKE ?)';
                const s = `%${search}%`;
                params.push(s, s, s, s, s);
                countParams.push(s, s, s, s, s);
                if (hasMainWhere) {
                    query += ' AND ' + searchCondition;
                    countQuery += ' AND ' + searchCondition;
                } else {
                    query += ' WHERE ' + searchCondition;
                    countQuery += ' WHERE ' + searchCondition;
                    hasMainWhere = true;
                    hasMainWhereCount = true;
                }
            }

            let orderBy = 'p.id DESC';
            if (sort === 'price_asc') orderBy = 'p.price ASC, p.id DESC';
            if (sort === 'price_desc') orderBy = 'p.price DESC, p.id DESC';
            if (sort === 'rating_desc') orderBy = 'avg_rating DESC, p.id DESC';

            const [countResult] = await db.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            const pages = Math.max(Math.ceil(total / limit), 1);

            query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const [rows] = await db.query(query, params);

            res.json({
                success: true,
                products: rows,
                pagination: { page, limit, total, pages }
            });
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 啟用/禁用
    static async toggleProduct(req, res) {
        try {
            if (!req.user || req.user.type !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }
            const productId = req.params.id;
            const db = require('../config/database');
            const [product] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
            if (!product || product.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            const current = product[0];
            const newEnabledState = current.enabled === 1 ? 0 : 1;
            await db.query('UPDATE products SET enabled = ? WHERE id = ?', [newEnabledState, productId]);
            res.json({ success: true, message: `Product ${newEnabledState === 1 ? 'enabled' : 'disabled'} successfully` });
        } catch (error) {
            console.error('Toggle product error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 商品詳情
    static async getProduct(req, res) {
        try {
            const db = require('../config/database');
            const productId = req.params.id;
            const userId = req.user?.id || null;

            const [products] = await db.query(
                `SELECT p.id, p.name, p.name_en, p.name_zh, p.price, p.description, p.image_url, p.category, p.stock,
                        COALESCE(p.enabled, 1) as enabled, p.created_at,
                        (SELECT ROUND(AVG(r.rating),1) FROM product_ratings r WHERE r.product_id = p.id) AS avg_rating,
                        (SELECT COUNT(*) FROM product_ratings r WHERE r.product_id = p.id) AS rating_count,
                        (SELECT r.rating FROM product_ratings r WHERE r.product_id = p.id AND r.user_id = ? LIMIT 1) AS user_rating
                 FROM products p
                 WHERE p.id = ?`,
                [userId, productId]
            );

            if (!products || products.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const [images] = await db.query(
                'SELECT id, url, created_at FROM product_images WHERE product_id = ? ORDER BY id DESC',
                [productId]
            );

            const product = { ...products[0], images: images || [] };
            res.json({ success: true, product });
        } catch (error) {
            console.error('Get product error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // 新增商品
    static async createProduct(req, res) {
        try {
            if (!req.user || req.user.type !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { name, name_en, name_zh, price, description, image_url, category, stock } = req.body;
            const finalNameEn = name_en || name || '';
            const finalNameZh = name_zh || '';
            const finalName = finalNameEn || finalNameZh;

            const imageUrlToUse = image_url || null;

            const [result] = await require('../config/database').query(
                'INSERT INTO products (name, name_en, name_zh, price, description, image_url, category, stock, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
                [finalName, finalNameEn, finalNameZh, price, description, imageUrlToUse, category, stock]
            );

            res.json({
                success: true,
                product: {
                    id: result.insertId,
                    name: finalName,
                    name_en: finalNameEn,
                    name_zh: finalNameZh,
                    price,
                    description,
                    image_url: imageUrlToUse,
                    category,
                    stock,
                    enabled: 1
                },
                message: 'Product created successfully'
            });

        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // 編輯商品
    static async updateProduct(req, res) {
        try {
            if (!req.user || req.user.type !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const productId = req.params.id;
            const { name, name_en, name_zh, price, description, image_url, category, stock, enabled = 1 } = req.body;

            const db = require('../config/database');
            const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            const current = rows[0];

            const finalNameEn = name_en ?? current.name_en ?? current.name;
            const finalNameZh = name_zh ?? current.name_zh;
            const finalName = name ?? finalNameEn ?? finalNameZh ?? current.name;

            const imageUrlToUse =
                image_url === undefined || image_url === ''
                    ? current.image_url
                    : image_url;

            await db.query(
                'UPDATE products SET name = ?, name_en = ?, name_zh = ?, price = ?, description = ?, image_url = ?, category = ?, stock = ?, enabled = ? WHERE id = ?',
                [
                    finalName,
                    finalNameEn,
                    finalNameZh,
                    price ?? current.price,
                    description ?? current.description,
                    imageUrlToUse,
                    category ?? current.category,
                    stock ?? current.stock,
                    enabled ?? current.enabled,
                    productId
                ]
            );

            res.json({ success: true, message: 'Product updated successfully' });

        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 刪除商品（新增：若商品已出現在訂單中，禁止刪除並回傳提示）
    static async deleteProduct(req, res) {
        try {
            if (!req.user || req.user.type !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }
            const productId = req.params.id;
            const db = require('../config/database');

            // 檢查是否存在
            const [p] = await db.query('SELECT id, image_url FROM products WHERE id = ?', [productId]);
            if (!p || p.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            // 檢查是否被訂單引用
            const [cntRows] = await db.query(
                'SELECT COUNT(*) AS cnt FROM order_items WHERE product_id = ?',
                [productId]
            );
            const cnt = cntRows?.[0]?.cnt || 0;
            if (cnt > 0) {
                return res.status(400).json({
                    error: 'Cannot delete product because it exists in orders. Please disable it instead.'
                });
            }

            // 若需要，同步刪除關聯圖片檔案（若有）
            const [imgs] = await db.query(
                'SELECT id, url FROM product_images WHERE product_id = ?',
                [productId]
            );
            for (const img of imgs || []) {
                try {
                    const filePath = path.join(
                        __dirname,
                        '..',
                        img.url.startsWith('/') ? img.url.slice(1) : img.url
                    );
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    console.warn('File delete warning:', e.message);
                }
            }

            // 刪除資料庫紀錄（images 先刪，再刪 product）
            await db.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
            await db.query('DELETE FROM products WHERE id = ?', [productId]);

            res.json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 上傳商品圖片
    static async uploadImages(req, res) {
        try {
            if (!req.user || req.user.type !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const productId = req.params.id;
            const db = require('../config/database');
            const [products] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
            if (!products || products.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const urls = req.files.map(f => `/uploads/products/${f.filename}`);

            const values = urls.map(url => [productId, url]);
            await db.query('INSERT INTO product_images (product_id, url) VALUES ?', [values]);

            if (!products[0].image_url || products[0].image_url === '') {
                await db.query('UPDATE products SET image_url = ? WHERE id = ?', [urls[0], productId]);
            }

            const [images] = await db.query(
                'SELECT id, url, created_at FROM product_images WHERE product_id = ? ORDER BY id DESC',
                [productId]
            );

            res.json({ success: true, images });
        } catch (error) {
            console.error('Upload images error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 刪除圖片
    static async deleteImage(req, res) {
        try {
            if (!req.user || req.user.type !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const productId = req.params.id;
            const imageId = req.params.imageId;

            const image = await Product.getImageById(imageId, productId);
            if (!image) {
                return res.status(404).json({ error: 'Image not found' });
            }

            try {
                const filePath = path.join(
                    __dirname,
                    '..',
                    image.url.startsWith('/') ? image.url.slice(1) : image.url
                );
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) {
                console.warn('File delete warning:', e.message);
            }

            const deleted = await Product.deleteImage(imageId, productId);
            if (!deleted) {
                return res.status(500).json({ error: 'Failed to delete image' });
            }

            const images = await Product.getImages(productId);
            res.json({ success: true, images });
        } catch (error) {
            console.error('Delete image error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // 商品評分
    static async rateProduct(req, res) {
        try {
            if (!req.user || req.user.type === 'admin') {
                return res.status(403).json({ error: 'Only customers can rate' });
            }

            const productId = parseInt(req.params.id, 10);
            const rating = parseInt(req.body.rating, 10);

            if (!productId || !rating || rating < 1 || rating > 5) {
                return res.status(400).json({ error: 'Rating must be an integer 1-5' });
            }

            const db = require('../config/database');

            const [prod] = await db.query('SELECT id, enabled FROM products WHERE id = ?', [productId]);
            if (!prod || prod.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (prod[0].enabled === 0) {
                return res.status(400).json({ error: 'Product is disabled' });
            }

            const [purchased] = await db.query(
                `SELECT COUNT(*) AS cnt
                   FROM order_items oi
                   JOIN orders o ON o.id = oi.order_id
                  WHERE o.user_id = ? AND oi.product_id = ? AND o.status <> 'cancelled'`,
                [req.user.id, productId]
            );
            if ((purchased[0]?.cnt || 0) === 0) {
                return res.status(400).json({ error: 'You can rate only after purchasing this product' });
            }

            await db.query(
                `INSERT INTO product_ratings (product_id, user_id, rating)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE rating = VALUES(rating), created_at = CURRENT_TIMESTAMP`,
                [productId, req.user.id, rating]
            );

            const [agg] = await db.query(
                `SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS rating_count
                   FROM product_ratings
                  WHERE product_id = ?`,
                [productId]
            );

            res.json({
                success: true,
                avg_rating: agg[0]?.avg_rating || 0,
                rating_count: agg[0]?.rating_count || 0,
                user_rating: rating
            });
        } catch (error) {
            console.error('Rate product error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
}

module.exports = ProductController;