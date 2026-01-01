import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Outlet } from '../models/Outlet.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/jwt.js';

/**
 * Create order from cart (supports guest orders)
 */
export const createOrder = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let decoded = null;
    let userId = null;

    // Token is optional for guest orders
    if (token) {
      decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    const { items, totalPrice, deliveryAddress, paymentMethod, customerInfo, orderType } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Validate orderType
    if (!orderType || !['dine_in', 'takeaway', 'delivery'].includes(orderType)) {
      return res.status(400).json({ success: false, message: 'Valid order type is required (dine_in, takeaway, or delivery)' });
    }

    // For guest orders, customerInfo is required
    if (!userId && (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.phone)) {
      return res.status(400).json({ success: false, message: 'Customer information is required for guest orders' });
    }

    // Get outletId from first item
    const outletId = items[0].outletId;
    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    const restaurantId = outlet.restaurantId?._id || outlet.restaurantId;

    const order = new Order({
      userId: userId || null,
      customerInfo: userId ? undefined : {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
      },
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
      paymentStatus: 'pending', // Will be updated when payment is verified
      orderType,
    });

    await order.save();

    // Clear cart after order creation (only if user is logged in)
    if (userId) {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }

    // Populate order before emitting (to match what frontend expects)
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('outletId', 'name location')
      .populate('restaurantId', 'name');

    // Emit socket event for real-time update
    const outletIdStr = outletId.toString();
    console.log(`[Socket] Emitting new-order to outlet-${outletIdStr}`, populatedOrder._id);
    req.io?.to(`outlet-${outletIdStr}`).emit('new-order', populatedOrder);
    if (userId) {
      req.io?.to(`user-${userId}`).emit('order-created', populatedOrder);
    }

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
    const { orderType } = req.query; // Get orderType filter from query params

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

    // Build query filter
    const queryFilter = { 
      outletId,
      paymentStatus: 'paid' // Only show paid orders to owners/managers
    };

    // Add orderType filter if provided
    if (orderType && ['dine_in', 'takeaway', 'delivery'].includes(orderType)) {
      queryFilter.orderType = orderType;
    }

    // Only show orders that are paid (for owner/manager view)
    const orders = await Order.find(queryFilter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching outlet orders:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Sync orders for vendor (returns orders updated/created since timestamp)
 */
export const syncVendorOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Only owners and managers can sync orders
    if (decoded.type !== 'owner' && decoded.type !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { since } = req.query; // ISO timestamp
    const sinceDate = since ? new Date(since) : new Date(0); // Default to epoch if not provided

    // Get all outlets the user has access to
    let accessibleOutletIds = [];

    if (decoded.type === 'owner') {
      // Owner: get all outlets from their restaurants
      const restaurants = await Restaurant.find({ ownerId: decoded.userId });
      const restaurantIds = restaurants.map(r => r._id);
      const outlets = await Outlet.find({ restaurantId: { $in: restaurantIds } });
      accessibleOutletIds = outlets.map(o => o._id);
    } else if (decoded.type === 'manager') {
      // Manager: get outlets they manage from User model
      const user = await User.findById(decoded.userId);
      if (user && user.managedOutlets) {
        accessibleOutletIds = user.managedOutlets.map(id => id.toString());
      }
    }

    if (accessibleOutletIds.length === 0) {
      return res.status(200).json({ success: true, orders: [] });
    }

    // Find orders updated or created since the timestamp
    const orders = await Order.find({
      outletId: { $in: accessibleOutletIds },
      paymentStatus: 'paid',
      $or: [
        { updatedAt: { $gte: sinceDate } },
        { createdAt: { $gte: sinceDate } }
      ]
    })
      .populate('userId', 'name email')
      .populate('outletId', 'name location')
      .populate('restaurantId', 'name')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing vendor orders:', error);
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

    // Populate order before emitting
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('outletId', 'name location')
      .populate('restaurantId', 'name');

    // Emit socket event for real-time update
    const outletIdStr = populatedOrder.outletId._id?.toString() || populatedOrder.outletId.toString();
    if (populatedOrder.userId) {
      req.io?.to(`user-${populatedOrder.userId._id || populatedOrder.userId}`).emit('order-updated', populatedOrder);
    }
    req.io?.to(`outlet-${outletIdStr}`).emit('order-updated', populatedOrder);

    return res.status(200).json({
      success: true,
      message: 'Order status updated',
      order: populatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;

    if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.paymentStatus = paymentStatus;
    
    // If payment is successful, update order status to confirmed
    if (paymentStatus === 'paid' && order.status === 'pending') {
      order.status = 'confirmed';
    }
    
    await order.save();

    // Populate order before emitting (to match what frontend expects)
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('outletId', 'name location')
      .populate('restaurantId', 'name');

    // Emit socket event for real-time update
    const outletIdStr = populatedOrder.outletId._id?.toString() || populatedOrder.outletId.toString();
    console.log(`[Socket] Emitting payment-updated to outlet-${outletIdStr}`, populatedOrder._id);
    if (populatedOrder.userId) {
      req.io?.to(`user-${populatedOrder.userId._id || populatedOrder.userId}`).emit('payment-updated', populatedOrder);
    }
    req.io?.to(`outlet-${outletIdStr}`).emit('payment-updated', populatedOrder);
    
    // Also emit new-order if payment is paid (so vendor sees it immediately)
    if (paymentStatus === 'paid') {
      req.io?.to(`outlet-${outletIdStr}`).emit('new-order', populatedOrder);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment status updated',
      order,
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Verify payment status
 */
export const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
        totalPrice: order.totalPrice,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

