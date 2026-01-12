import { Inventory } from '../models/Inventory.js';
import { Outlet } from '../models/Outlet.js';
import { Restaurant } from '../models/Restaurant.js';
import { verifyToken } from '../middleware/jwt.js';
import mongoose from 'mongoose';

/**
 * Get inventory items for an outlet
 */
export const getInventoryByOutlet = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { outletId } = req.params;

    // Verify access
    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    const restaurant = await Restaurant.findById(outlet.restaurantId);
    const isOwner = decoded.type === 'owner' && 
                    restaurant &&
                    restaurant.ownerId?.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      outlet.managers?.some(m => m.toString() === decoded.userId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const inventory = await Inventory.find({ outletId })
      .sort({ category: 1, itemName: 1 });

    return res.status(200).json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching inventory' });
  }
};

/**
 * Create inventory item
 */
export const createInventoryItem = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { 
      itemName, 
      category, 
      currentStock, 
      minStock, 
      unit, 
      costPerUnit, 
      supplier, 
      lastRestocked, 
      expiryDate, 
      notes, 
      outletId 
    } = req.body;

    if (!itemName || !outletId) {
      return res.status(400).json({ success: false, message: 'Item name and outlet ID are required' });
    }

    // Verify access
    const outlet = await Outlet.findById(outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    const restaurant = await Restaurant.findById(outlet.restaurantId);
    const isOwner = decoded.type === 'owner' && 
                    restaurant &&
                    restaurant.ownerId?.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      outlet.managers?.some(m => m.toString() === decoded.userId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const inventoryItem = new Inventory({
      itemName,
      category: category || 'Other',
      currentStock: currentStock || 0,
      minStock: minStock || 0,
      unit: unit || 'pieces',
      costPerUnit: costPerUnit || 0,
      supplier: supplier || '',
      lastRestocked: lastRestocked ? new Date(lastRestocked) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes: notes || '',
      outletId: new mongoose.Types.ObjectId(outletId),
    });

    await inventoryItem.save();

    return res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      inventory: inventoryItem,
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating inventory item' });
  }
};

/**
 * Update inventory item
 */
export const updateInventoryItem = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { itemId } = req.params;
    const updateData = req.body;

    const inventoryItem = await Inventory.findById(itemId);
    if (!inventoryItem) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    // Verify access
    const outlet = await Outlet.findById(inventoryItem.outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    const restaurant = await Restaurant.findById(outlet.restaurantId);
    const isOwner = decoded.type === 'owner' && 
                    restaurant &&
                    restaurant.ownerId?.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      outlet.managers?.some(m => m.toString() === decoded.userId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Convert date strings to Date objects if provided
    if (updateData.lastRestocked) {
      updateData.lastRestocked = new Date(updateData.lastRestocked);
    }
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }
    if (updateData.expiryDate === '') {
      updateData.expiryDate = undefined;
    }

    // Remove outletId from update data (cannot be changed)
    delete updateData.outletId;

    const updatedItem = await Inventory.findByIdAndUpdate(
      itemId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      inventory: updatedItem,
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating inventory item' });
  }
};

/**
 * Delete inventory item
 */
export const deleteInventoryItem = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { itemId } = req.params;

    const inventoryItem = await Inventory.findById(itemId);
    if (!inventoryItem) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    // Verify access
    const outlet = await Outlet.findById(inventoryItem.outletId).populate('restaurantId');
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    const restaurant = await Restaurant.findById(outlet.restaurantId);
    const isOwner = decoded.type === 'owner' && 
                    restaurant &&
                    restaurant.ownerId?.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      outlet.managers?.some(m => m.toString() === decoded.userId);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Inventory.findByIdAndDelete(itemId);

    return res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting inventory item' });
  }
};
