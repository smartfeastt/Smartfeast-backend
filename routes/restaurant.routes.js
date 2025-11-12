import express from "express";
import { authMiddleware } from "../middleware/middleware.js";
import {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantById,
  getRestaurantByName,
  getOwnerRestaurants,
} from "../controllers/restaurant.controller.js";

const router = express.Router();

// Public routes
router.get("/name/:restaurantName", getRestaurantByName); // /view/restaurantname
router.get("/:restaurantId", getRestaurantById);

// Owner routes
router.post("/create", createRestaurant);
router.put("/update/:restaurantId", updateRestaurant);
router.delete("/delete/:restaurantId", deleteRestaurant);
router.get("/owner/all",authMiddleware, getOwnerRestaurants);

export default router;

