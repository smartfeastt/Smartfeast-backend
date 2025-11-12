import { MenuItem } from "../models/MenuItem.js";
import { verifyToken } from "../middleware/jwt.js";
import mongoose from "mongoose";

/**
 * ✅ Create Menu Item
 */
const createItem = async (req, res) => {
  try {
    const { token, outletId, itemName, itemPrice, itemQuantity, itemPhoto, itemDescription, category, isAvailable } = req.body;

    if (!token || !outletId) {
      return res.status(400).json({ success: false, message: "Token and outletId are required" });
    }

    // Verify JWT
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Create menu item
    const newItem = new MenuItem({
      itemName,
      itemPrice,
      itemQuantity,
      itemPhoto,
      itemDescription,
      category,
      isAvailable,
      outletId: new mongoose.Types.ObjectId(outletId),
    });

    await newItem.save();
    return res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      item: newItem,
    });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return res.status(500).json({ success: false, message: "Server error while creating item" });
  }
};

/**
 * ✏️ Update Menu Item
 */
const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { token, ...updateData } = req.body;

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(itemId, updateData, { new: true });

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return res.status(500).json({ success: false, message: "Server error while updating item" });
  }
};

/**
 * 🗑️ Delete Menu Item
 */
const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { token } = req.body;

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const deletedItem = await MenuItem.findByIdAndDelete(itemId);
    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting item" });
  }
};

/**
 * 🔍 Get single item by ID
 */
const getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await MenuItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("Error fetching item:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching item" });
  }
};

// ✅ Export all functions at the bottom
export {
  createItem,
  updateItem,
  deleteItem,
  getItemById,
};
