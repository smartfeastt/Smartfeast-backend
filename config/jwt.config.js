import jwt from "jsonwebtoken";
import { loadEnv } from './loadenv.js';

loadEnv();
// Function to generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
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
