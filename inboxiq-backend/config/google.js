const { google } = require("googleapis");
console.log("Using Client ID:", process.env.GOOGLE_CLIENT_ID);
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:5000/auth/google/callback"
);

module.exports = oauth2Client;