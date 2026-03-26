const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
    // A1. 用戶註冊功能
    static async register(req, res) {
        try {
            const { name, email, password, address } = req.body;
            
            // 驗證所有欄位
            if (!name || !email || !password || !address) {
                return res.status(400).json({ error: 'All fields are required' });
            }
            
            // 密碼長度檢查
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            
            // 檢查郵箱是否已被註冊
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            
            // 創建新用戶（A1: 註冊時提供姓名、郵箱、密碼、送貨地址）
            const user = await User.create({
                email,
                password: password,
                name,
                address
            });
            
            // 生成 JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email, type: user.type },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Registration successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    address: user.address,
                    type: user.type
                }
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // A2. 用戶登入功能
    static async login(req, res) {
        try {
            const { email, password, isAdmin = false } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // 管理員權限檢查
            if (isAdmin && user.type !== 'admin') {
                return res.status(401).json({ error: 'Admin access required' });
            }
            
            // 密碼驗證
            const validPassword = (password === user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // 生成 token
            const token = jwt.sign(
                { id: user.id, email: user.email, type: user.type },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    address: user.address,
                    type: user.type
                }
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // 獲取用戶資料
    static async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true, user });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
}

module.exports = AuthController;