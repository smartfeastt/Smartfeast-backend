import express from "express";
import {
  createItem,
  updateItem,
  deleteItem,
  getItemById,
} from "../controllers/item.controller.js";

const router = express.Router();

router.post("/create", createItem);

router.put("/update/:itemId", updateItem);

router.delete("/delete/:itemId", deleteItem);

router.get("/:itemId", getItemById);

export default router;
