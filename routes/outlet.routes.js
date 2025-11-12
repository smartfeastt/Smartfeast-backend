import express from "express";
import {
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletById,
  getOutletsByRestaurant,
  assignManager,
  removeManager,
} from "../controllers/outlet.controller.js";

const router = express.Router();

// Public routes
router.get("/restaurant/:restaurantId", getOutletsByRestaurant); // ?token=xxx (optional)
router.get("/:outletId", getOutletById);

// Owner/Manager routes
router.post("/create", createOutlet);
router.put("/update/:outletId", updateOutlet);
router.delete("/delete/:outletId", deleteOutlet);

// Manager assignment (Owner only)
router.post("/:outletId/assign-manager", assignManager);
router.delete("/:outletId/remove-manager/:managerId", removeManager);

export default router;

