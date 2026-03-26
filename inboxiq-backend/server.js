
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { protect } = require("./middleware/authMiddleware");

// Connect to MongoDB
connectDB();

const app = express();

// =====================
// MIDDLEWARE
// =====================

// Enable CORS
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
  credentials: true,
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// ROUTES
// =====================
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");

app.use("/auth", authRoutes);
app.use("/email", emailRoutes);

// Protected route example
app.get("/api/me", protect, (req, res) => {
  res.json(req.user);
});

// Root Health Check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "InboxIQ API is running" });
});

// =====================
// ERROR HANDLING
// =====================

// Handle 404
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// =====================
// SERVER SETUP
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
});