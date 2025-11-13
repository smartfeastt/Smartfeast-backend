import { Outlet } from "../models/Outlet.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { verifyToken } from "../middleware/jwt.js";
import mongoose from "mongoose";

/**
 * ✅ Create Outlet (Owner only)
 */
const createOutlet = async (req, res) => {
  try {
    const { token, restaurantId, name, location } = req.body;

    if (!token || !restaurantId || !name) {
      return res.status(400).json({ success: false, message: "Token, restaurantId, and name are required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Check if user is owner
    if (decoded.type !== 'owner') {
      return res.status(403).json({ success: false, message: "Only owners can create outlets" });
    }

    // Verify restaurant exists and belongs to owner
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    if (restaurant.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ success: false, message: "You don't own this restaurant" });
    }

    // Check outlet limit
    const currentOutletCount = restaurant.outlets.length;
    if (currentOutletCount >= restaurant.outlet_count) {
      return res.status(400).json({ 
        success: false, 
        message: `Outlet limit reached (${restaurant.outlet_count} outlets allowed)` 
      });
    }

    // Create outlet
    const newOutlet = new Outlet({
      name,
      location,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      managers: [],
      menuIds: [],
    });

    await newOutlet.save();

    // Add outlet to restaurant
    restaurant.outlets.push(newOutlet._id);
    await restaurant.save();

    return res.status(201).json({
      success: true,
      message: "Outlet created successfully",
      outlet: newOutlet,
    });
  } catch (error) {
    console.error("Error creating outlet:", error);
    return res.status(500).json({ success: false, message: "Server error while creating outlet" });
  }
};

/**
 * ✏️ Update Outlet
 */
const updateOutlet = async (req, res) => {
  try {
    const { outletId } = req.params;
    const { token, ...updateData } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    // Check access: owner of restaurant OR assigned manager
    const isOwner = decoded.type === 'owner' && 
                    outlet.restaurantId.ownerId.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      decoded.managedOutlets.includes(outletId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updatedOutlet = await Outlet.findByIdAndUpdate(outletId, updateData, { new: true });
    return res.status(200).json({
      success: true,
      message: "Outlet updated successfully",
      outlet: updatedOutlet,
    });
  } catch (error) {
    console.error("Error updating outlet:", error);
    return res.status(500).json({ success: false, message: "Server error while updating outlet" });
  }
};

/**
 * 🗑️ Delete Outlet (Owner only)
 */
const deleteOutlet = async (req, res) => {
  try {
    const { outletId } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (decoded.type !== 'owner') {
      return res.status(403).json({ success: false, message: "Only owners can delete outlets" });
    }

    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    if (outlet.restaurantId.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ success: false, message: "You don't own this outlet" });
    }

    // Remove outlet from restaurant
    const restaurant = await Restaurant.findById(outlet.restaurantId._id);
    restaurant.outlets = restaurant.outlets.filter(
      id => id.toString() !== outletId
    );
    await restaurant.save();

    // Remove outlet from managers' managedOutlets
    await User.updateMany(
      { managedOutlets: outletId },
      { $pull: { managedOutlets: outletId } }
    );

    await Outlet.findByIdAndDelete(outletId);

    return res.status(200).json({
      success: true,
      message: "Outlet deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting outlet:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting outlet" });
  }
};

/**
 * 🔍 Get Outlet by ID
 */
const getOutletById = async (req, res) => {
  try {
    const { outletId } = req.params;
    console.log("inside outlet by id");
    const outlet = await Outlet.findById(outletId);

    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    return res.status(200).json({ success: true, outlet });
  } catch (error) {
    console.error("Error fetching outlet:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching outlet" });
  }
};

/**
 * 📋 Get All Outlets for a Restaurant (Public or Authenticated)
 */
const getOutletsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { token } = req.query;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const outlets = await Outlet.find({ restaurantId })
      .populate('managers', 'name email')
      .select('-menuIds'); // Don't populate menuIds here, use separate endpoint

    return res.status(200).json({ success: true, outlets });
  } catch (error) {
    console.error("Error fetching outlets:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching outlets" });
  }
};

/**
 * 👥 Assign Manager to Outlet (Owner only)
 */
const assignManager = async (req, res) => {
  try {
    const { outletId } = req.params;
    const { token, managerEmail, managerPassword } = req.body;

    if (!token || !managerEmail || !managerPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Token, managerEmail, and managerPassword are required" 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (decoded.type !== 'owner') {
      return res.status(403).json({ success: false, message: "Only owners can assign managers" });
    }

    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    if (outlet.restaurantId.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ success: false, message: "You don't own this outlet" });
    }

    // Check if manager exists, if not create one
    let manager = await User.findOne({ email: managerEmail });
    
    if (!manager) {
      // Create new manager account
      const { hashPassword } = await import("../middlewear/bcrypt.js");
      const hashedPassword = await hashPassword(managerPassword);
      
      manager = new User({
        name: managerEmail.split('@')[0],
        email: managerEmail,
        password: hashedPassword,
        role: 'manager',
      });
      await manager.save();
    } else if (manager.role !== 'manager') {
      return res.status(400).json({ 
        success: false, 
        message: "User exists but is not a manager" 
      });
    }

    // Check if already assigned
    if (outlet.managers.some(m => m.toString() === manager._id.toString())) {
      return res.status(400).json({ 
        success: false, 
        message: "Manager already assigned to this outlet" 
      });
    }

    // Assign manager
    outlet.managers.push(manager._id);
    await outlet.save();

    // Add outlet to manager's managedOutlets
    if (!manager.managedOutlets.includes(outlet._id)) {
      manager.managedOutlets.push(outlet._id);
      await manager.save();
    }

    return res.status(200).json({
      success: true,
      message: "Manager assigned successfully",
      manager: { _id: manager._id, name: manager.name, email: manager.email },
    });
  } catch (error) {
    console.error("Error assigning manager:", error);
    return res.status(500).json({ success: false, message: "Server error while assigning manager" });
  }
};

/**
 * 🚫 Remove Manager from Outlet (Owner only)
 */
const removeManager = async (req, res) => {
  try {
    const { outletId, managerId } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (decoded.type !== 'owner') {
      return res.status(403).json({ success: false, message: "Only owners can remove managers" });
    }

    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    if (outlet.restaurantId.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ success: false, message: "You don't own this outlet" });
    }

    // Remove manager from outlet
    outlet.managers = outlet.managers.filter(m => m.toString() !== managerId);
    await outlet.save();

    // Remove outlet from manager's managedOutlets
    await User.findByIdAndUpdate(managerId, {
      $pull: { managedOutlets: outletId }
    });

    return res.status(200).json({
      success: true,
      message: "Manager removed successfully",
    });
  } catch (error) {
    console.error("Error removing manager:", error);
    return res.status(500).json({ success: false, message: "Server error while removing manager" });
  }
};

export {
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletById,
  getOutletsByRestaurant,
  assignManager,
  removeManager,
};

