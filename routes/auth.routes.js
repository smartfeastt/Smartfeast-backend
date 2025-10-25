// routes/signin.js
import express from "express";
import { signIn, signUp, logout, user_exists, generate_otp, verify_otp, reset_password, is_Authenticated } from "../controllers/auth.controller.js";

const router = express.Router();

router.post('/signin', signIn);
router.post('/userExists', user_exists);
router.post('/generateOTP', generate_otp);
router.post('/verifyOTP', verify_otp);
router.post('/signup', signUp);
router.post('/logout', logout);
router.post('/reset_password', reset_password);
router.post('/isAuthenticated', is_Authenticated);

export default router;
