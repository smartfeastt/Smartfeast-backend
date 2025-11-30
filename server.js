import { configureApp } from "./config/app.config.js";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.routes.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import outletRoutes from "./routes/outlet.routes.js";
import itemRoutes from "./routes/item.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import supabaseRoutes from "./routes/supabase.routes.js";
import supabase from './config/supabase.config.js';


const app = await configureApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL?.split(",") || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/outlet", outletRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/supabase", supabaseRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join outlet room
  socket.on('join-outlet', (outletId) => {
    socket.join(`outlet-${outletId}`);
    console.log(`Socket ${socket.id} joined outlet-${outletId}`);
  });

  // Join user room
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user-${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", message: "SmartFeast API is running" });
});

app.get('/api/supabase', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ limit: 1 });

    if (error) {
      return res.status(400).json({ error });
    }

    return res.json({
      message: "Supabase response",
      users: data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
  });
}

