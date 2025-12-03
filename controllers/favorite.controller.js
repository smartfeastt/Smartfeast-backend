import { Favorite } from '../models/Favorite.js';
import { Restaurant } from '../models/Restaurant.js';
import { verifyToken } from '../middleware/jwt.js';

/**
 * Get user favorites
 */
export const getUserFavorites = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'user') {
      return res.status(401).json({ success: false, message: 'Invalid token or not a user' });
    }

    const favorites = await Favorite.find({ userId: decoded.userId })
      .populate('restaurantId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      favorites: favorites.map(fav => fav.restaurantId),
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Add restaurant to favorites
 */
export const addFavorite = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'user') {
      return res.status(401).json({ success: false, message: 'Invalid token or not a user' });
    }

    const { restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID is required' });
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Check if already favorited
    const existing = await Favorite.findOne({ userId: decoded.userId, restaurantId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already in favorites',
        favorite: existing,
      });
    }

    const favorite = new Favorite({
      userId: decoded.userId,
      restaurantId,
    });

    await favorite.save();

    return res.status(201).json({
      success: true,
      message: 'Restaurant added to favorites',
      favorite,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Already in favorites' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Remove restaurant from favorites
 */
export const removeFavorite = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'user') {
      return res.status(401).json({ success: false, message: 'Invalid token or not a user' });
    }

    const { restaurantId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      userId: decoded.userId,
      restaurantId,
    });

    if (!favorite) {
      return res.status(404).json({ success: false, message: 'Favorite not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Restaurant removed from favorites',
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Check if restaurant is favorited
 */
export const checkFavorite = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(200).json({ success: true, isFavorite: false });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'user') {
      return res.status(200).json({ success: true, isFavorite: false });
    }

    const { restaurantId } = req.params;

    const favorite = await Favorite.findOne({
      userId: decoded.userId,
      restaurantId,
    });

    return res.status(200).json({
      success: true,
      isFavorite: !!favorite,
    });
  } catch (error) {
    console.error('Error checking favorite:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

