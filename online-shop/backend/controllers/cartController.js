const Cart = require('../models/Cart');
const Product = require('../models/Product');

class CartController {
    // A8/A9/A10: 獲取購物車內容（顯示商品名稱、價格、數量、總金額）
    static async getCart(req, res) {
        try {
            const cartItems = await Cart.findByUserId(req.user.id);
            res.json({ success: true, cart: cartItems });
        } catch (error) {
            console.error('Get cart error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // A7: 加入購物車
    static async addToCart(req, res) {
        try {
            const { productId, quantity = 1 } = req.body;
            
            if (!productId) {
                return res.status(400).json({ error: 'Product ID is required' });
            }
            
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
           
            // 檢查庫存
            if (product.stock < quantity) {
                return res.status(400).json({ error: 'Insufficient stock' });
            }
     
            // A7: 加入購物車
            await Cart.addItem(req.user.id, productId, quantity);
            
            const cartItems = await Cart.findByUserId(req.user.id);
            const cartCount = await Cart.getCartCount(req.user.id);
            
            res.json({ 
                success: true, 
                message: 'Added to cart successfully',
                cart: cartItems,
                cartCount 
            });
            
        } catch (error) {
            console.error('Add to cart error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // A9: 更改購物車商品數量
    static async updateCartItem(req, res) {
        try {
            const { productId } = req.params;
            const { quantity } = req.body;
            
            if (quantity === undefined) {
                return res.status(400).json({ error: 'Quantity is required' });
            }
            
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            
            const cartItems = await Cart.findByUserId(req.user.id);
            const cartItem = cartItems.find(item => item.product_id == productId);
            const currentQuantity = cartItem ? cartItem.quantity : 0;
            
            const newTotalNeeded = quantity;
            
            if (product.stock < newTotalNeeded) {
                return res.status(400).json({ error: 'Insufficient stock' });
            }
            
            // A9: 更新數量
            await Cart.updateQuantity(req.user.id, productId, quantity);
            
            const updatedCart = await Cart.findByUserId(req.user.id);
            const cartCount = await Cart.getCartCount(req.user.id);
            
            res.json({ 
                success: true, 
                message: 'Cart updated successfully',
                cart: updatedCart,
                cartCount 
            });
            
        } catch (error) {
            console.error('Update cart error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // A10: 從購物車移除商品
    static async removeCartItem(req, res) {
        try {
            const { productId } = req.params;
            
            // A10: 移除商品
            await Cart.removeItem(req.user.id, productId);
            
            const cartItems = await Cart.findByUserId(req.user.id);
            const cartCount = await Cart.getCartCount(req.user.id);
            
            res.json({ 
                success: true, 
                message: 'Item removed from cart',
                cart: cartItems,
                cartCount 
            });
            
        } catch (error) {
            console.error('Remove cart item error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // A8/A9: 獲取購物車商品數量
    static async getCartCount(req, res) {
        try {
            const count = await Cart.getCartCount(req.user.id);
            res.json({ success: true, count });
        } catch (error) {
            console.error('Get cart count error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // A11: 結帳時清空購物車
    static async clearCart(req, res) {
        try {
            await Cart.clearCart(req.user.id);
            res.json({ success: true, message: 'Cart cleared' });
        } catch (error) {
            console.error('Clear cart error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
}

module.exports = CartController;