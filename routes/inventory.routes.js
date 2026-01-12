import express from 'express';
import { authMiddleware } from '../middleware/middleware.js';
import {
  getInventoryByOutlet,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../controllers/inventory.controller.js';

const router = express.Router();

// All routes require authentication
router.get('/outlet/:outletId', authMiddleware, getInventoryByOutlet);
router.post('/', authMiddleware, createInventoryItem);
router.put('/:itemId', authMiddleware, updateInventoryItem);
router.delete('/:itemId', authMiddleware, deleteInventoryItem);

export default router;
