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
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
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

    // Redirect to frontend with token and email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}?token=${token}&email=${email}`);
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
