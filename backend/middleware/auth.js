const jwt = require('jsonwebtoken');

// A2: 認證中間件（驗證用戶身份）
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        console.log('Auth middleware - Token:', token ? 'Present' : 'Missing');
        
        if (!token) {
            // 沒有 token 的用戶繼續前進（匿名用戶），但 req.user 為 undefined
            return next();
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        
        console.log('Auth middleware - User set:', decoded.email, 'Type:', decoded.type);
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        // token 無效的用戶繼續前進（視為匿名用戶）
        next();
    }
};

module.exports = auth;