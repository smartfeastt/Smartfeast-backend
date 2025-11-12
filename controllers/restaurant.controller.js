import { Restaurant } from "../models/Restaurant.js";
import { verifyToken } from "../middleware/jwt.js";

/**
 * ✅ Create Restaurant
 */
const createRestaurant = async (req, res) => {
  try {
    const { token, name, address, phone, email, description, image } = req.body;

    if (!token) return res.status(400).json({ success: false, message: "Token is required" });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ success: false, message: "Invalid or expired token" });

    const newRestaurant = new Restaurant({ name, address, phone, email, description, image });
    await newRestaurant.save();

    return res.status(201).json({ success: true, message: "Restaurant created successfully", restaurant: newRestaurant });
  } catch (error) {
    console.error("Error creating restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while creating restaurant" });
  }
};

/**
 * ✏️ Update Restaurant
 */
const updateRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { token, ...updateData } = req.body;

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ success: false, message: "Invalid or expired token" });

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(restaurantId, updateData, { new: true });
    if (!updatedRestaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    return res.status(200).json({ success: true, message: "Restaurant updated successfully", restaurant: updatedRestaurant });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while updating restaurant" });
  }
};

/**
 * 🗑️ Delete Restaurant
 */
const deleteRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { token } = req.body;

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ success: false, message: "Invalid or expired token" });

    const deletedRestaurant = await Restaurant.findByIdAndDelete(restaurantId);
    if (!deletedRestaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    return res.status(200).json({ success: true, message: "Restaurant deleted successfully" });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting restaurant" });
  }
};

// ✅ Export all
export {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
};
