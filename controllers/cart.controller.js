import { Cart } from '../models/Cart.js';
import { verifyToken } from '../middleware/jwt.js';

/**
 * Get user's cart
 */
export const getCart = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    let cart = await Cart.findOne({ userId: decoded.userId }).populate('items.itemId');
    
    if (!cart) {
      cart = new Cart({ userId: decoded.userId, items: [] });
      await cart.save();
    }

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Add item to cart
 */
export const addToCart = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { itemId, quantity = 1, itemName, itemPrice, itemPhoto, outletId } = req.body;

    let cart = await Cart.findOne({ userId: decoded.userId });
    
    if (!cart) {
      cart = new Cart({ userId: decoded.userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.itemId.toString() === itemId
    );

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        itemId,
        itemName,
        itemPrice,
        quantity,
        itemPhoto,
        outletId,
      });
    }

    await cart.save();
    await cart.populate('items.itemId');

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { itemId, quantity } = req.body;

    const cart = await Cart.findOne({ userId: decoded.userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.itemId.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.itemId');

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('Error updating cart:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId: decoded.userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      (item) => item.itemId.toString() !== itemId
    );

    await cart.save();
    await cart.populate('items.itemId');

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Clear cart
 */
export const clearCart = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const cart = await Cart.findOne({ userId: decoded.userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    return res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Sync cart (replace all items)
 */
export const syncCart = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { items } = req.body;

    let cart = await Cart.findOne({ userId: decoded.userId });
    
    if (!cart) {
      cart = new Cart({ userId: decoded.userId, items: [] });
    }

    // Replace all items
    cart.items = (items || []).map(item => ({
      itemId: item.itemId || item._id,
      itemName: item.itemName,
      itemPrice: item.itemPrice,
      quantity: item.quantity,
      itemPhoto: item.itemPhoto,
      outletId: item.outletId,
    }));

    await cart.save();
    await cart.populate('items.itemId');

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('Error syncing cart:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

