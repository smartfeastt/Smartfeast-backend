import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOutletOrders,
  updateOrderStatus,
  updatePaymentStatus,
  verifyPayment,
} from '../controllers/order.controller.js';

const router = express.Router();

router.post('/create', createOrder);
router.get('/user', getUserOrders);
router.get('/outlet/:outletId', getOutletOrders);
router.put('/:orderId/status', updateOrderStatus);
router.put('/:orderId/payment', updatePaymentStatus);
router.get('/:orderId/verify', verifyPayment);

export default router;

