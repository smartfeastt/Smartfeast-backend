import dotenv from "dotenv";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User_Collection.js";
import { comparePassword, hashPassword } from "../middleware/bcrypt.js";
import { generateToken, verifyToken } from "../middleware/jwt.js";

dotenv.config();

// ---------------------------------------------------------------------------------------------------------------------------------------
// SIGN IN
// ---------------------------------------------------------------------------------------------------------------------------------------
const signIn = async (req, res) => {
  console.log("entered signin POST form read");
  const { email, password, type } = req.body;

  try {
    if (type === "User") {
      // Future implementation for customers
      return res.json({ success: false, message: "User login not implemented yet" });
    } 
    else if (type === "Owner" || type === "Manager") {
      const user = await User.findOne({ email });
      if (!user) return res.json({ success: false, message: "Email not found" });

      if (user.role !== type.toLowerCase()) {
        return res.json({ success: false, message: `This account is not registered as ${type}` });
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) return res.json({ success: false, message: "Invalid password" });

      const payload = { email, email_id: user._id, type };
      const token = await generateToken(payload);

      return res.json({
        success: true,
        message: `${type} login successful`,
        token,
      });
    } 
    else {
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
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user) {
      console.log("user exists");
      return res.status(400).json({ message: "Email is already registered." });
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
  const { email, password, type } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new User({
      email,
      password: hashedPassword,
      role: type.toLowerCase(),
    });

    await newUser.save();

    const payload = { email, email_id: newUser._id, type };
    const token = await generateToken(payload);

    return res.status(201).json({
      success: true,
      message: `${type} registration successful`,
      token,
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).send("Internal Server Error");
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
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email, role: type.toLowerCase() });
      await user.save();
    }

    const jwtPayload = { email, email_id: user._id, type };
    const token = await generateToken(jwtPayload);

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
