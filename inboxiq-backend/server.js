
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { protect } = require("./middleware/authMiddleware");

const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

const envOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server and CLI requests without Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
  });
});

app.use("/auth", authRoutes);
app.use("/email", emailRoutes);

app.get("/api/me", protect, (req, res) => {
  res.json(req.user);
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`
    );
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});