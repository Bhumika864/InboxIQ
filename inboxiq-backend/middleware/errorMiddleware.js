/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  // Keep test output clean: skip expected 4xx noise during test runs.
  if (!(isTest && statusCode < 500)) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}:`, err.message);
  }

  return res.status(statusCode).json({
    message: statusCode >= 500 && isProduction ? "Internal Server Error" : (err.message || "Internal Server Error"),
    stack: isProduction ? undefined : err.stack,
  });
};

/**
 * Middleware for handling 404 Not Found errors
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  res.status(404);
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};
