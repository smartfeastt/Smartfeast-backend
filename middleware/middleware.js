import { verifyToken } from "./jwt.js"; // adjust path if needed

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Use your existing jwt.js verify function
    const decoded = verifyToken(token);
    console.log("Decoded token:", JSON.stringify(decoded, null, 2));

    // Attach to req (so controller can access)
    req.user = decoded;
    req.body.user = decoded;
    console.log("Token verified");
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }
};
