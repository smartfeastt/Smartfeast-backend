import express from "express";
import { signedUrl } from "../controllers/supabase.controller.js";

const router = express.Router();

router.post("/signed-url", signedUrl);

export default router;

