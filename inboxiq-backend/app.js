const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { protect } = require("./middleware/authMiddleware");
const { authLimiter, apiLimiter } = require("./middleware/rateLimitMiddleware");

const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");

const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

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

  app.use("/auth", authLimiter, authRoutes);
  app.use("/email", apiLimiter, protect, emailRoutes);

  app.get("/api/me", protect, (req, res) => {
    res.json(req.user);
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
