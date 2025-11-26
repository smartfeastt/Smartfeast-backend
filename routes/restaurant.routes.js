import express from "express";
import { authMiddleware } from "../middleware/middleware.js";
import {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantById,
  getRestaurantByName,
  getOwnerRestaurants,
  getAllRestaurants,
} from "../controllers/restaurant.controller.js";

const router = express.Router();

// Public routes
router.get("/all", getAllRestaurants); // Get all restaurants for customers
router.get("/name/:restaurantName", getRestaurantByName); // /view/restaurantname
router.get("/:restaurantId", getRestaurantById);

// Owner routes
router.post("/create", createRestaurant);
router.put("/update/:restaurantId", updateRestaurant);
router.delete("/delete/:restaurantId", deleteRestaurant);
router.get("/owner/all",authMiddleware, getOwnerRestaurants);

export default router;

