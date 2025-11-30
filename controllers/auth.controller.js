import dotenv from "dotenv";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User.js";
import { comparePassword, hashPassword } from "../middlewear/bcrypt.js";
import { generateToken, verifyToken } from "../middleware/jwt.js";

dotenv.config();

// ---------------------------------------------------------------------------------------------------------------------------------------
// SIGN IN
// ---------------------------------------------------------------------------------------------------------------------------------------
const signIn = async (req, res) => {
  console.log("entered signin POST form read");
  const { email, password, type } = req.body;

  try {
    const normalizedType = type.toLowerCase();
    
    // Find user by email AND role (allows same email with different roles)
    const user = await User.findOne({ email, role: normalizedType });
    
    if (!user) {
      return res.json({ 
        success: false, 
        message: `Email not registered as ${type}. Please sign up first.` 
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    // For Owner/Manager, get restaurants and outlets
    if (normalizedType === 'owner' || normalizedType === 'manager') {
      const userWithRelations = await User.findById(user._id)
        .populate('ownedRestaurants')
        .populate('managedOutlets');
      
      const payload = { 
        userId: user._id,
        email, 
        type: normalizedType,
        name: user.name,
        ownedRestaurants: userWithRelations.ownedRestaurants.map(r => r._id),
        managedOutlets: userWithRelations.managedOutlets.map(o => o._id)
      };
      const token = generateToken(payload);
      
      return res.json({
        success: true,
        message: `${type} login successful`,
        token,
      });
    } 
    // For User
    else if (normalizedType === 'user') {
      const payload = { 
        userId: user._id,
        email, 
        type: 'user',
        name: user.name
      };
      const token = generateToken(payload);
      
      return res.json({
        success: true,
        message: "User login successful",
        token,
      });
    } 
    else {
      console.log("Invalid user type");
      return res.json({ success: false, message: "Invalid user type" });
    }
  } catch (err) {
    console.error("Error during signin:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------------------------------------------------------------------
const logout = async (req, res) => {
  console.log("logout encountered");
  return res.json({ success: true, message: "Logged out successfully" });
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// CHECK USER EXISTS
// ---------------------------------------------------------------------------------------------------------------------------------------
const user_exists = async (req, res) => {
  console.log("inside userExists route");
  const { email, type } = req.body;

  try {
    // Check if user exists with this email and role combination
    const normalizedType = type ? type.toLowerCase() : null;
    const query = normalizedType 
      ? { email, role: normalizedType }
      : { email };
    
    const user = await User.findOne(query);
    if (user) {
      console.log("user exists");
      const message = normalizedType 
        ? `Email is already registered as ${type}.`
        : "Email is already registered.";
      return res.status(400).json({ message });
    }
    console.log("user not registered");
    return res.status(200).json({ message: "continue" });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).send("Internal Server Error");
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// GENERATE OTP
// ---------------------------------------------------------------------------------------------------------------------------------------
const generate_otp = async (req, res) => {
  console.log("inside generateotp route");
  const { email, text } = req.body;

  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const otp = generateOTP();
  console.log(`Generated OTP: ${otp}`);

  const otp_token = generateToken({ otp });
  await sendEmail({
    to: email,
    subject: "Your SmartFeast OTP",
    text: `${otp}  ${text}\nDo not share this code with anyone.`,
  });

  return res.status(200).json({
    success: true,
    message: "OTP sent successfully",
    token: otp_token, // Send token to frontend (store temporarily)
  });
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// VERIFY OTP
// ---------------------------------------------------------------------------------------------------------------------------------------
const verify_otp = (req, res) => {
  console.log("inside verify_otp");
  const { otp, token } = req.body;

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    if (decoded.otp === otp) {
      console.log("OTP verified successfully");
      return res.status(200).json({ success: true, message: "OTP is correct" });
    } else {
      console.log("OTP mismatch");
      return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });
    }
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// SIGN UP
// ---------------------------------------------------------------------------------------------------------------------------------------
const signUp = async (req, res) => {
  console.log("in signup POST read");
  const { name, email, password, type } = req.body;

  try {
    // Validate input
    if (!email || !password || !type) {
      return res.status(400).json({ success: false, message: "Email, password, and type are required" });
    }

    // Validate type
    const validTypes = ['owner', 'manager', 'user'];
    const normalizedType = type.toLowerCase();
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({ success: false, message: "Invalid user type. Must be Owner, Manager, or User" });
    }

    // Check if user with this email and role already exists
    const existingUser = await User.findOne({ email, role: normalizedType });
    if (existingUser) {
      return res.status(400).json({ success: false, message: `Email already registered as ${type}` });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = new User({
      name: name || email.split('@')[0], // Use provided name or default from email
      email,
      password: hashedPassword,
      role: normalizedType,
    });

    await newUser.save();

    // Generate token with user info
    const payload = { 
      userId: newUser._id,
      email, 
      type: normalizedType,
      ownedRestaurants: [],
      managedOutlets: []
    };
    const token = generateToken(payload);

    return res.status(201).json({
      success: true,
      message: `${type} registration successful`,
      token,
      user: {
        userId: newUser._id,
        email: newUser.email,
        name: newUser.name,
        type: normalizedType,
      }
    });
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// RESET PASSWORD
// ---------------------------------------------------------------------------------------------------------------------------------------
const reset_password = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// AUTH CHECK
// ---------------------------------------------------------------------------------------------------------------------------------------
const is_Authenticated = async (req, res) => {
  console.log("inside Authentication");
  const { token } = req.body;
  try {
    const decoded = verifyToken(token);
    if (decoded) {
      return res.status(200).json({ authenticated: true, data: decoded });
    } else {
      return res.status(401).json({ authenticated: false, message: "Invalid token" });
    }
  } catch (error) {
    return res.status(401).json({ authenticated: false, message: "Authentication failed" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// GOOGLE SIGN-IN
// ---------------------------------------------------------------------------------------------------------------------------------------
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const google_signin = async (req, res) => {
  console.log("inside google signin");
  try {
    const { credential, type } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const { sub: googleId, email, name, picture } = payload;
    const normalizedType = type.toLowerCase();
    
    // Find user by email AND role (allows same email with different roles)
    let user = await User.findOne({ email, role: normalizedType });

    if (!user) {
      user = new User({ 
        email, 
        role: normalizedType,
        name: name || email.split('@')[0],
        password: '' // Google auth doesn't need password
      });
      await user.save();
    }

    const userWithRelations = await User.findById(user._id)
      .populate('ownedRestaurants')
      .populate('managedOutlets');
    
    const jwtPayload = { 
      userId: user._id,
      email, 
      type: type.toLowerCase(),
      ownedRestaurants: userWithRelations.ownedRestaurants.map(r => r._id),
      managedOutlets: userWithRelations.managedOutlets.map(o => o._id)
    };
    const token = generateToken(jwtPayload);

    return res.status(200).json({
      success: true,
      token,
      user: { _id: googleId, email, name, picture },
      message: `${type} Google sign-in successful`,
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    return res.status(500).json({ success: false, message: "Server error during authentication" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------
export {
  signIn,
  signUp,
  logout,
  user_exists,
  generate_otp,
  verify_otp,
  reset_password,
  is_Authenticated,
  google_signin,
};
