/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Use console.log for better visibility in some terminal environments
  console.log(`[CRITICAL ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (err.stack) console.log(err.stack);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    // Only send stack trace in development mode
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

/**
 * Middleware for handling 404 Not Found errors
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};
