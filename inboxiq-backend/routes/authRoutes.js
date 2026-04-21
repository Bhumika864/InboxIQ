const express = require("express");
const router = express.Router();
const { oauth2Client } = require("../config/google");
const { google } = require("googleapis");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const scopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

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

const normalizeAllowedOrigin = (value) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const normalized = parsed.origin;
    return allowedOrigins.has(normalized) ? normalized : null;
  } catch (error) {
    return null;
  }
};

// Helper to generate JWT
const generateToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET || "inboxiq_jwt_secret", {
    expiresIn: "30d",
  });
};

// =====================
// STEP 1: Redirect to Google Login
// =====================
router.get("/login", (req, res) => {
  res.redirect("/auth/google");
});

router.get("/google", (req, res) => {
  const requestedOrigin = normalizeAllowedOrigin(req.query.redirectOrigin);
  const defaultOrigin = normalizeAllowedOrigin(process.env.FRONTEND_URL) || "http://localhost:5173";
  const redirectOrigin = requestedOrigin || defaultOrigin;

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: redirectOrigin,
  });
  res.redirect(url);
});

// =====================
// STEP 2: Google Callback — exchange code for tokens, save user, issue JWT
// =====================
router.get("/google/callback", async (req, res, next) => {
  try {
    const { code } = req.query;

    if (!code) {
      res.status(400);
      throw new Error("No code provided");
    }

    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user profile from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    const email = String(data.email).toLowerCase();

    // Save or update user in DB
    const user = await User.findOneAndUpdate(
      { email },
      {
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined, // only present on first login
      },
      { upsert: true, new: true }
    );

    // Generate JWT for frontend
    const token = generateToken(email);

    console.log("User logged in:", email);

    // Resolve callback destination from OAuth state with allowlist validation.
    const requestedOrigin = normalizeAllowedOrigin(req.query.state);
    const fallbackOrigin = normalizeAllowedOrigin(process.env.FRONTEND_URL) || "http://localhost:5173";
    const frontendUrl = new URL(requestedOrigin || fallbackOrigin);
    frontendUrl.searchParams.set("token", token);
    frontendUrl.searchParams.set("email", email);

    res.redirect(frontendUrl.toString());
  } catch (err) {
    next(err);
  }
});

// =====================
// GET: Logout (handled on frontend, but adding endpoint for cleanup)
// =====================
router.get("/logout", (req, res) => {
  res.json({ message: "Logged out. Please clear token from local storage." });
});

module.exports = router;
