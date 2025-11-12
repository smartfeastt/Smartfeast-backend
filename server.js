import { configureApp } from "./config/app.config.js";
import authRoutes from "./routes/auth.routes.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import outletRoutes from "./routes/outlet.routes.js";
import itemRoutes from "./routes/item.routes.js";
import supabaseRoutes from "./routes/supabase.routes.js";

const app = await configureApp();

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/outlet", outletRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/supabase", supabaseRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "SmartFeast API is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// For Vercel serverless
export default app;

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

