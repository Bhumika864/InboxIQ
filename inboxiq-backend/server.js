
require("dotenv").config();

const connectDB = require("./config/db");
const { validateEnv } = require("./config/env");
const { createApp } = require("./app");
const PORT = process.env.PORT || 5000;
const app = createApp();

const startServer = async () => {
  validateEnv();
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