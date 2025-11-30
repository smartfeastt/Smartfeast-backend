import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Outlet } from '../models/Outlet.js';
import { Restaurant } from '../models/Restaurant.js';
import { verifyToken } from '../middleware/jwt.js';

/**
 * Create order from cart
 */
export const createOrder = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { items, totalPrice, deliveryAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Get outletId from first item
    const outletId = items[0].outletId;
    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    const restaurantId = outlet.restaurantId?._id || outlet.restaurantId;

    const order = new Order({
      userId: decoded.userId,
      outletId,
      restaurantId,
      items: items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemPrice: item.itemPrice,
        quantity: item.quantity,
        itemPhoto: item.itemPhoto,
      })),
      totalPrice,
      deliveryAddress,
      paymentMethod,
      paymentStatus: paymentMethod !== 'cash' ? 'paid' : 'pending',
    });

    await order.save();

    // Clear cart after order creation
    const cart = await Cart.findOne({ userId: decoded.userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    // Emit socket event for real-time update
    const outletIdStr = outletId.toString();
    req.io?.to(`outlet-${outletIdStr}`).emit('new-order', order);
    req.io?.to(`user-${decoded.userId}`).emit('order-created', order);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get user orders
 */
export const getUserOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const orders = await Order.find({ userId: decoded.userId })
      .populate('outletId', 'name location')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get outlet orders
 */
export const getOutletOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { outletId } = req.params;

    // Verify user has access to this outlet
    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    // Check if user is owner or manager
    const restaurant = await Restaurant.findById(outlet.restaurantId);
    const isOwner = decoded.type === 'owner' && 
                    restaurant &&
                    restaurant.ownerId?.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      outlet.managers?.some(m => m.toString() === decoded.userId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const orders = await Order.find({ outletId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching outlet orders:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify access
    const outlet = await Outlet.findById(order.outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }
    
    const restaurant = await Restaurant.findById(outlet.restaurantId);
    const isOwner = decoded.type === 'owner' && 
                    restaurant &&
                    restaurant.ownerId?.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      outlet.managers?.some(m => m.toString() === decoded.userId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    order.status = status;
    await order.save();

    // Emit socket event for real-time update
    const outletIdStr = order.outletId._id?.toString() || order.outletId.toString();
    req.io?.to(`user-${order.userId}`).emit('order-updated', order);
    req.io?.to(`outlet-${outletIdStr}`).emit('order-updated', order);

    return res.status(200).json({
      success: true,
      message: 'Order status updated',
      order,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

