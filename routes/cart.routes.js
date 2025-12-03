import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
} from '../controllers/cart.controller.js';

const router = express.Router();

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.put('/sync', syncCart);
router.delete('/remove/:itemId', removeFromCart);
router.delete('/clear', clearCart);

export default router;

