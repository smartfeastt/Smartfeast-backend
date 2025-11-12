import express from "express";
import {
  createItem,
  updateItem,
  deleteItem,
  getItemById,
  getItemsByOutlet,
  getItemsByOutletName,
  updateItemPhoto,
} from "../controllers/item.controller.js";
import { authMiddleware } from "../middleware/middleware.js";

const router = express.Router();

// Public routes (more specific routes first)
router.get("/view/:restaurantName/:outletName", getItemsByOutletName); // /view/restaurantname/outletname
router.get("/outlet/:outletId",authMiddleware, getItemsByOutlet); // ?token=xxx (optional)

// Owner/Manager routes
router.post("/create", createItem);
router.put("/update/:itemId", updateItem);
router.delete("/delete/:itemId", deleteItem);
router.put("/:itemId/photo", updateItemPhoto); // Update photo URL after upload

// Get single item (must be last to avoid conflicts)
router.get("/:itemId", getItemById);

export default router;
