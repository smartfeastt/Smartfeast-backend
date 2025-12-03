import { Outlet } from "../models/Outlet.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { verifyToken } from "../middleware/jwt.js";
import supabase from "../config/supabase.config.js";
import { geocodeAddress, calculateDistance } from "../utils/geocoding.js";
import mongoose from "mongoose";

/**
 * ✅ Create Outlet (Owner only)
 */
const createOutlet = async (req, res) => {
  try {
    const { 
      token, 
      restaurantId, 
      name, 
      location,
      address,
      coordinates,
      outletImage 
    } = req.body;

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

    // Prepare address data
    let addressData = null;
    let coordinatesData = null;

    if (address) {
      addressData = {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
        country: address.country || 'India',
        fullAddress: address.fullAddress || 
          `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.pincode || ''}`.trim(),
      };

      // If coordinates provided, use them; otherwise geocode from address
      if (coordinates && coordinates.latitude && coordinates.longitude) {
        coordinatesData = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      } else if (addressData.fullAddress) {
        // Auto-geocode from address
        const geocoded = await geocodeAddress(addressData.fullAddress);
        if (geocoded) {
          coordinatesData = geocoded;
        }
      }
    }

    // Create outlet
    const newOutlet = new Outlet({
      name,
      location: location || addressData?.fullAddress || '',
      address: addressData,
      coordinates: coordinatesData,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      managers: [],
      menuIds: [],
      outletImage: outletImage || "",
    });

    await newOutlet.save();

    // Generate signed URL for image upload
    let signedUrlData = null;
    const outletId = newOutlet._id.toString();
    const path = `outlets/${outletId}`;
    
    const { data, error } = await supabase
      .storage
      .from('smartfeast')
      .createSignedUploadUrl(path, 60);

    if (!error && data) {
      signedUrlData = {
        signedUrl: data.signedUrl,
        path: path,
      };
      const fullUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/smartfeast/${path}`;
      newOutlet.image = fullUrl;
      await newOutlet.save();
    }

    // Add outlet to restaurant
    restaurant.outlets.push(newOutlet._id);
    await restaurant.save();

    return res.status(201).json({
      success: true,
      message: "Outlet created successfully",
      outlet: newOutlet,
      signedUrl: signedUrlData,
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
    const { token, address, coordinates, outletImage, ...updateData } = req.body;

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

    // Handle address and coordinates update
    if (address || coordinates) {
      let addressData = outlet.address || {};
      let coordinatesData = outlet.coordinates || {};

      if (address) {
        addressData = {
          street: address.street || addressData.street || '',
          city: address.city || addressData.city || '',
          state: address.state || addressData.state || '',
          pincode: address.pincode || addressData.pincode || '',
          country: address.country || addressData.country || 'India',
          fullAddress: address.fullAddress || 
            `${address.street || addressData.street || ''}, ${address.city || addressData.city || ''}, ${address.state || addressData.state || ''} ${address.pincode || addressData.pincode || ''}`.trim(),
        };

        // If coordinates provided, use them; otherwise geocode from address
        if (coordinates && coordinates.latitude && coordinates.longitude) {
          coordinatesData = {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          };
        } else if (addressData.fullAddress && (!coordinatesData.latitude || !coordinatesData.longitude)) {
          // Auto-geocode from address if coordinates not provided
          const geocoded = await geocodeAddress(addressData.fullAddress);
          if (geocoded) {
            coordinatesData = geocoded;
          }
        }
      } else if (coordinates && coordinates.latitude && coordinates.longitude) {
        coordinatesData = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      }

      updateData.address = addressData;
      updateData.coordinates = coordinatesData;
      if (addressData.fullAddress) {
        updateData.location = addressData.fullAddress;
      }
    }

    // Handle outletImage update
    if (outletImage !== undefined) {
      updateData.outletImage = outletImage || "";
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
 * 🌐 Get All Outlets with Coordinates (Public endpoint for map)
 */
const getAllOutletsForMap = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    const outlets = await Outlet.find({
      'coordinates.latitude': { $exists: true, $ne: null },
      'coordinates.longitude': { $exists: true, $ne: null },
    })
      .populate('restaurantId', 'name image')
      .select('name location address coordinates image restaurantId');

    // If user location provided, calculate distances and sort
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      
      const outletsWithDistance = outlets.map(outlet => {
        const distance = calculateDistance(
          userLat,
          userLng,
          outlet.coordinates.latitude,
          outlet.coordinates.longitude
        );
        return {
          ...outlet.toObject(),
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        };
      });

      outletsWithDistance.sort((a, b) => a.distance - b.distance);
      return res.status(200).json({ success: true, outlets: outletsWithDistance });
    }

    return res.status(200).json({ success: true, outlets });
  } catch (error) {
    console.error("Error fetching outlets for map:", error);
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

    // Check if user exists, if not create one with manager role
    let manager = await User.findOne({ email: managerEmail, role: 'manager' });
    
    if (!manager) {
      // Check if user exists with different role
      const existingUser = await User.findOne({ email: managerEmail });
      
      if (existingUser) {
        // User exists but not as manager - add manager role or use existing user
        // For now, we'll allow assigning any user as manager
        manager = existingUser;
        
        // If user doesn't have manager role, we can still assign them
        // The managedOutlets array will track which outlets they manage
      } else {
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
      }
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

/**
 * Sync outlets for vendor (returns outlets updated/created since timestamp)
 */
const syncVendorOutlets = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (decoded.type !== 'owner' && decoded.type !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { since } = req.query;
    const sinceDate = since ? new Date(since) : new Date(0);

    let outlets = [];

    if (decoded.type === 'owner') {
      // Owner: get all outlets from their restaurants
      const restaurants = await Restaurant.find({ ownerId: decoded.userId });
      const restaurantIds = restaurants.map(r => r._id);
      outlets = await Outlet.find({
        restaurantId: { $in: restaurantIds },
        $or: [
          { updatedAt: { $gte: sinceDate } },
          { createdAt: { $gte: sinceDate } }
        ]
      })
        .populate('restaurantId', 'name')
        .populate('managers', 'name email')
        .sort({ updatedAt: -1 });
    } else if (decoded.type === 'manager') {
      // Manager: get outlets they manage
      const user = await User.findById(decoded.userId);
      if (user && user.managedOutlets) {
        const outletIds = user.managedOutlets.map(id => id.toString());
        outlets = await Outlet.find({
          _id: { $in: outletIds },
          $or: [
            { updatedAt: { $gte: sinceDate } },
            { createdAt: { $gte: sinceDate } }
          ]
        })
          .populate('restaurantId', 'name')
          .populate('managers', 'name email')
          .sort({ updatedAt: -1 });
      }
    }

    return res.status(200).json({
      success: true,
      outlets,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing vendor outlets:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export {
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletById,
  getOutletsByRestaurant,
  getAllOutletsForMap,
  assignManager,
  removeManager,
  syncVendorOutlets,
};

