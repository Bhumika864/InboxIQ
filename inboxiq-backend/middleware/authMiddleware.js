const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to protect routes by verifying JWT
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "inboxiq_jwt_secret");

      // Get user from the token and attach to request object (exclude tokens)
      req.user = await User.findOne({
        email: String(decoded.email).toLowerCase(),
      }).select("-accessToken -refreshToken");

      if (!req.user) {
        res.status(401);
        return next(new Error("User not found"));
      }

      return next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      res.status(401);
      return next(new Error("Not authorized, token failed"));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error("Not authorized, no token"));
  }
};

module.exports = { protect };
