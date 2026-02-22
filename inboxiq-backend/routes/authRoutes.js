const express = require("express");
const router = express.Router();
const oauth2Client = require("../config/google");
const { google } = require("googleapis");
const User = require("../models/User");

const scopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

// Step 1: Redirect user to Google login
router.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent"
  });

  res.redirect(url);
});


router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:5000/auth/google/callback"
    );

    const { tokens } = await client.getToken(code);

    const payload = JSON.parse(
      Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
    );

    const userEmail = payload.email;

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        email: userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      },
      { upsert: true, new: true }
    );

    console.log("User saved:", userEmail);

    res.send("Authentication successful");
  } catch (error) {
    console.error("OAUTH ERROR:", error);
    res.status(500).send("Auth failed");
  }
});
module.exports = router;