import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { verifyToken } from "../middleware/jwt.js";
import mongoose from "mongoose";

/**
 * ✅ Create Restaurant (Owner only)
 */
const createRestaurant = async (req, res) => {
  try {
    const { token, name, outlet_count } = req.body;

    if (!token || !name) {
      return res.status(400).json({ success: false, message: "Token and name are required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (decoded.type !== 'owner') {
      return res.status(403).json({ success: false, message: "Only owners can create restaurants" });
    }

    const newRestaurant = new Restaurant({
      name,
      ownerId: new mongoose.Types.ObjectId(decoded.userId),
      outlets: [],
      outlet_count: outlet_count || 3,
    });

    await newRestaurant.save();

    // Add restaurant to owner's ownedRestaurants
    await User.findByIdAndUpdate(decoded.userId, {
      $push: { ownedRestaurants: newRestaurant._id }
    });

    return res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      restaurant: newRestaurant,
    });
  } catch (error) {
    console.error("Error creating restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while creating restaurant" });
  }
};

/**
 * ✏️ Update Restaurant (Owner only)
 */
const updateRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { token, ...updateData } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (decoded.type !== 'owner') {
      return res.status(403).json({ success: false, message: "Only owners can update restaurants" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    if (restaurant.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ success: false, message: "You don't own this restaurant" });
    }

    // Don't allow changing ownerId
    delete updateData.ownerId;

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(restaurantId, updateData, { new: true });
    return res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while updating restaurant" });
  }
};

/**
 * 🗑️ Delete Restaurant (Owner only)
 */
const deleteRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (decoded.type !== 'owner') {
      return res.status(403).json({ success: false, message: "Only owners can delete restaurants" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    if (restaurant.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ success: false, message: "You don't own this restaurant" });
    }

    // Remove restaurant from owner's ownedRestaurants
    await User.findByIdAndUpdate(decoded.userId, {
      $pull: { ownedRestaurants: restaurantId }
    });

    await Restaurant.findByIdAndDelete(restaurantId);

    return res.status(200).json({ success: true, message: "Restaurant deleted successfully" });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting restaurant" });
  }
};

/**
 * 🔍 Get Restaurant by ID (Public or Authenticated)
 */
const getRestaurantById = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId)
      .populate('ownerId', 'name email')
      .populate('outlets', 'name location');

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    return res.status(200).json({ success: true, restaurant });
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching restaurant" });
  }
};

/**
 * 🔍 Get Restaurant by Name (Public - for /view/restaurantname route)
 */
const getRestaurantByName = async (req, res) => {
  try {
    const { restaurantName } = req.params;

    const restaurant = await Restaurant.findOne({ name: restaurantName })
      .populate('ownerId', 'name email')
      .populate({
        path: 'outlets',
        select: 'name location',
      });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    return res.status(200).json({ success: true, restaurant });
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching restaurant" });
  }
};

/**
 * 📋 Get All Restaurants for Owner
 */
const getOwnerRestaurants = async (req, res) => {
  try {
    const { user } = req.body;

    if (user.type !== 'owner') {
      console.log("User is not an owner");
      return res.status(403).json({ success: false, message: "Only owners can view their restaurants" });
    }

    const restaurants = await Restaurant.find({ ownerId: user.userId })
      .populate('outlets', 'name location');
    console.log("send the data");
    return res.status(200).json({ success: true, restaurants });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching restaurants" });
  }
};

// ✅ Export all
export {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantById,
  getRestaurantByName,
  getOwnerRestaurants,
};
