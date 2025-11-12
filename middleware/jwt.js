import jwt from "jsonwebtoken";
import { loadEnv } from '../config/loadenv.js';

loadEnv();

// Function to generate JWT token with user info
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1w", // Token expires in 1 week
  });
};

// Function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null; // Invalid token
  }
};

export { generateToken, verifyToken };

