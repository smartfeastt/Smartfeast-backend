import express from 'express';
import { 
  createCategory, 
  getCategoriesByOutlet, 
  updateCategory, 
  deleteCategory 
} from '../controllers/category.controller.js';

const router = express.Router();

// Create category
router.post('/create', createCategory);

// Get categories by outlet
router.get('/outlet/:outletId', getCategoriesByOutlet);

// Update category
router.put('/update/:categoryId', updateCategory);

// Delete category
router.delete('/delete/:categoryId', deleteCategory);

export default router;
