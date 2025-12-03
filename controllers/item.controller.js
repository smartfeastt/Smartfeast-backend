import { MenuItem } from "../models/MenuItem.js";
import { Outlet } from "../models/Outlet.js";
import { Restaurant } from "../models/Restaurant.js";
import { verifyToken } from "../middleware/jwt.js";
import supabase from "../config/supabase.config.js";
import mongoose from "mongoose";

/**
 * ✅ Create Menu Item (with signed URL for photo)
 * Flow: Create item → Get MongoDB ID → Generate signed URL → Return to frontend
 */
const createItem = async (req, res) => {
  try {
    const { token, outletId, itemName, itemPrice, itemQuantity, itemDescription, category, isAvailable } = req.body;

    if (!token || !outletId || !itemName || !itemPrice) {
      return res.status(400).json({ success: false, message: "Token, outletId, itemName, and itemPrice are required" });
    }

    // Verify JWT
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Check access: owner of restaurant OR assigned manager
    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    const isOwner = decoded.type === 'owner' && 
                    outlet.restaurantId.ownerId.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      decoded.managedOutlets.includes(outletId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Create menu item first (without photo)
    const newItem = new MenuItem({
      itemName,
      itemPrice,
      itemQuantity: itemQuantity || 0,
      itemDescription,
      category,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      outletId: new mongoose.Types.ObjectId(outletId),
    });

    await newItem.save();


    // Generate signed URL using the item ID
    let signedUrlData = null;
      
    const itemId = newItem._id.toString();

    console.log("item saved"+itemId);
    const path = `menu-items/${itemId}`;
    
    const { data, error } = await supabase
      .storage
      .from('smartfeast')
      .createSignedUploadUrl(path, 60); // valid for 60 seconds

    if (error) {
      console.error('Supabase storage error:', error);
      // Continue without photo URL
    } else {
      signedUrlData = {
        signedUrl: data.signedUrl,
        path: path,
      };
      const fullUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/smartfeast/${path}`;
      newItem.itemPhoto = fullUrl;
      await newItem.save();
    }
    
    console.log("function success"+signedUrlData);
    return res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      item: newItem,
      signedUrl: signedUrlData,
    });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return res.status(500).json({ success: false, message: "Server error while creating item" });
  }
};

/**
 * 📸 Update Item Photo URL (after frontend uploads using signed URL)
 */
const updateItemPhoto = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { token, fileUrl } = req.body;

    if (!token || !fileUrl) {
      return res.status(400).json({ success: false, message: "Token and fileUrl are required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const item = await MenuItem.findById(itemId).populate('outletId');
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const outlet = await Outlet.findById(item.outletId._id).populate('restaurantId');
    const isOwner = decoded.type === 'owner' && 
                    outlet.restaurantId.ownerId.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      decoded.managedOutlets.includes(item.outletId._id.toString());

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Construct full URL
    const SUPABASE_URL = process.env.supabase_url;
    const fullUrl = `${SUPABASE_URL}/storage/v1/object/public/printease/${fileUrl}`;

    item.itemPhoto = fullUrl;
    await item.save();

    return res.status(200).json({
      success: true,
      message: "Item photo updated successfully",
      item,
    });
  } catch (error) {
    console.error("Error updating item photo:", error);
    return res.status(500).json({ success: false, message: "Server error while updating item photo" });
  }
};

/**
 * ✏️ Update Menu Item
 */
const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { token, ...updateData } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const item = await MenuItem.findById(itemId).populate('outletId');
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const outlet = await Outlet.findById(item.outletId._id).populate('restaurantId');
    const isOwner = decoded.type === 'owner' && 
                    outlet.restaurantId.ownerId.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      decoded.managedOutlets.includes(item.outletId._id.toString());

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(itemId, updateData, { new: true });

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

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const item = await MenuItem.findById(itemId).populate('outletId');
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const outlet = await Outlet.findById(item.outletId._id).populate('restaurantId');
    const isOwner = decoded.type === 'owner' && 
                    outlet.restaurantId.ownerId.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      decoded.managedOutlets.includes(item.outletId._id.toString());

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await MenuItem.findByIdAndDelete(itemId);

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

    const item = await MenuItem.findById(itemId).populate('outletId', 'name location');
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("Error fetching item:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching item" });
  }
};

/**
 * 📋 Get Menu Items by Outlet (Public or Authenticated)
 */
const getItemsByOutlet = async (req, res) => {
  console.log("getItemsByOutlet controller");
  try {
    const { outletId } = req.params;
    const { user } = req;
    console.log(user);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (user.type !== 'owner' && user.type !== 'manager') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const outlet = await Outlet.findById(outletId);
    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    const items = await MenuItem.find({ outletId }).sort({ category: 1, itemName: 1 });

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching items" });
  }
};

/**
 * 📋 Get Menu Items by Outlet Name (Public - for /view/restaurantname/outletname route)
 */
const getItemsByOutletName = async (req, res) => {
  try {
    const { restaurantName, outletName } = req.params;

    // Find restaurant by name
    const restaurant = await Restaurant.findOne({ name: restaurantName });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // Find outlet by name within restaurant
    const outlet = await Outlet.findOne({ 
      restaurantId: restaurant._id, 
      name: outletName 
    });
    if (!outlet) {
      return res.status(404).json({ success: false, message: "Outlet not found" });
    }

    const items = await MenuItem.find({ outletId: outlet._id })
      .sort({ category: 1, itemName: 1 });

    return res.status(200).json({ 
      success: true, 
      items,
      outlet: {
        _id: outlet._id,
        name: outlet.name,
        location: outlet.location,
        outletImage: outlet.outletImage || null,
        profilePhotoUrl: outlet.profilePhotoUrl || null,
        image: outlet.image || null,
        address: outlet.address || null,
        coordinates: outlet.coordinates || null,
      }
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching items" });
  }
};

// ✅ Export all functions at the bottom
export {
  createItem,
  updateItem,
  deleteItem,
  getItemById,
  getItemsByOutlet,
  getItemsByOutletName,
  updateItemPhoto,
};

