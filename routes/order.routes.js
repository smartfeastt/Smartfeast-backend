import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOutletOrders,
  syncVendorOrders,
  updateOrderStatus,
  updatePaymentStatus,
  verifyPayment,
  addItemsToOrder,
} from '../controllers/order.controller.js';
import { authMiddleware } from '../middleware/middleware.js';

const router = express.Router();

router.post('/create', createOrder);
router.post('/:orderId/add-items', addItemsToOrder); // Add items to existing order (reorder)
router.get('/user', getUserOrders);
router.get('/outlet/:outletId', getOutletOrders);
router.get('/sync', authMiddleware, syncVendorOrders); // Sync endpoint for vendor
router.put('/:orderId/status', updateOrderStatus);
router.put('/:orderId/payment', updatePaymentStatus);
router.get('/:orderId/verify', verifyPayment);

export default router;

