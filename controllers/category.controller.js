import { Category } from "../models/Category.js";
import { Outlet } from "../models/Outlet.js";
import { verifyToken } from "../middleware/jwt.js";

/**
 * Create a new category for an outlet
 */
const createCategory = async (req, res) => {
  try {
    const { outletId, name, description, sortOrder } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !outletId || !name) {
      return res.status(400).json({ 
        success: false, 
        message: "Token, outletId, and name are required" 
      });
    }

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

    // Check if category already exists for this outlet
    const existingCategory = await Category.findOne({ name, outletId });
    if (existingCategory) {
      return res.status(400).json({ 
        success: false, 
        message: "Category already exists for this outlet" 
      });
    }

    const newCategory = new Category({
      name,
      description,
      outletId,
      sortOrder: sortOrder || 0,
    });

    await newCategory.save();

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({ success: false, message: "Server error while creating category" });
  }
};

/**
 * Get all categories for an outlet (public endpoint)
 */
const getCategoriesByOutlet = async (req, res) => {
  try {
    const { outletId } = req.params;

    if (!outletId) {
      return res.status(400).json({ 
        success: false, 
        message: "outletId is required" 
      });
    }

    const categories = await Category.find({ outletId, isActive: true })
      .sort({ sortOrder: 1, name: 1 });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching categories" });
  }
};

/**
 * Update a category
 */
const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, sortOrder, isActive } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !categoryId) {
      return res.status(400).json({ 
        success: false, 
        message: "Token and categoryId are required" 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const category = await Category.findById(categoryId).populate({
      path: 'outletId',
      populate: { path: 'restaurantId' }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Check access
    const isOwner = decoded.type === 'owner' && 
                    category.outletId.restaurantId.ownerId.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      decoded.managedOutlets.includes(category.outletId._id.toString());

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Update fields
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ success: false, message: "Server error while updating category" });
  }
};

/**
 * Delete a category
 */
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !categoryId) {
      return res.status(400).json({ 
        success: false, 
        message: "Token and categoryId are required" 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const category = await Category.findById(categoryId).populate({
      path: 'outletId',
      populate: { path: 'restaurantId' }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Check access
    const isOwner = decoded.type === 'owner' && 
                    category.outletId.restaurantId.ownerId.toString() === decoded.userId;
    const isManager = decoded.type === 'manager' && 
                      decoded.managedOutlets.includes(category.outletId._id.toString());

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await Category.findByIdAndDelete(categoryId);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting category" });
  }
};

export { createCategory, getCategoriesByOutlet, updateCategory, deleteCategory };
