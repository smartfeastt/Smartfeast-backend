import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOutletOrders,
  updateOrderStatus,
} from '../controllers/order.controller.js';

const router = express.Router();

router.post('/create', createOrder);
router.get('/user', getUserOrders);
router.get('/outlet/:outletId', getOutletOrders);
router.put('/:orderId/status', updateOrderStatus);

export default router;

