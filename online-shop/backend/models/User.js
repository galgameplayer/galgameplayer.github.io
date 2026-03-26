const db = require('../config/database');

class User {
    // A1/A2: 根據郵箱查找用戶（用於註冊檢查和登入驗證）
    static async findByEmail(email) {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    // A2/A13: 根據ID查找用戶（用於獲取用戶資料）
    static async findById(id) {
        const [rows] = await db.query('SELECT id, email, name, address, type, created_at FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    // A1: 創建新用戶（註冊）
    static async create(userData) {
        const { email, password, name, address, type = 'customer' } = userData;
        // A1: 儲存用戶資訊（姓名、郵箱、密碼、地址）
        const [result] = await db.query(
            'INSERT INTO users (email, password, name, address, type) VALUES (?, ?, ?, ?, ?)',
            [email, password, name, address, type]
        );
        return { id: result.insertId, email, name, address, type };
    }

    // A19: 獲取所有用戶（管理員功能）
    static async getAllUsers() {
        const [rows] = await db.query('SELECT id, email, name, type, created_at FROM users ORDER BY created_at DESC');
        return rows;
    }
}

module.exports = User;