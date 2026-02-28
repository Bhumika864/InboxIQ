// const express = require("express");
// const router = express.Router();
// const oauth2Client = require("../config/google");
// const { google } = require("googleapis");
// const User = require("../models/User");

// const scopes = [
//   "openid",
//   "email",
//   "https://www.googleapis.com/auth/gmail.readonly",
//   "https://www.googleapis.com/auth/gmail.send",
// ];

// // Step 1: Redirect user to Google login
// router.get("/google", (req, res) => {
//   const url = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: scopes,
//     prompt: "consent"
//   });

//   res.redirect(url);
// });


// router.get("/google/callback", async (req, res) => {
//   try {
//     const code = req.query.code;

//     const client = new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       "http://localhost:5000/auth/google/callback"
//     );

//     const { tokens } = await client.getToken(code);

//     const payload = JSON.parse(
//       Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
//     );

//     const userEmail = payload.email;

//     await User.findOneAndUpdate(
//       { email: userEmail },
//       {
//         email: userEmail,
//         accessToken: tokens.access_token,
//         refreshToken: tokens.refresh_token
//       },
//       { upsert: true, new: true }
//     );

//     console.log("User saved:", userEmail);

//     res.send("Authentication successful");
//   } catch (error) {
//     console.error("OAUTH ERROR:", error);
//     res.status(500).send("Auth failed");
//   }
// });
// module.exports = router;




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

// =====================
// STEP 1: Redirect to Google Login
// =====================
router.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
  res.redirect(url);
});

// =====================
// STEP 2: Google Callback — exchange code for tokens, save user
// =====================
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) return res.status(400).send("No code provided");

    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user profile from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    const email = data.email;

    // Save or update user in DB
    await User.findOneAndUpdate(
      { email },
      {
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined, // only present on first login
      },
      { upsert: true, new: true }
    );

    // Save email in session
    req.session.userEmail = email;

    console.log("User logged in:", email);

    // Redirect to frontend
    res.redirect(`http://localhost:3000?email=${email}`);
  } catch (err) {
    console.error("Auth callback error:", err);
    res.status(500).send("Authentication failed");
  }
});

// =====================
// GET: Current logged-in user (session check)
// =====================
router.get("/me", (req, res) => {
  if (req.session.userEmail) {
    return res.json({ email: req.session.userEmail });
  }
  res.status(401).json({ error: "Not logged in" });
});

// =====================
// GET: Logout
// =====================
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

module.exports = router;