import express from 'express';
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from '../controllers/favorite.controller.js';

const router = express.Router();

router.get('/', getUserFavorites);
router.post('/', addFavorite);
router.delete('/:restaurantId', removeFavorite);
router.get('/check/:restaurantId', checkFavorite);

export default router;

