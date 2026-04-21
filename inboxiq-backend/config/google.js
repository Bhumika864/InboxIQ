// const { google } = require("googleapis");

// if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
//   console.error("WARNING: Google Client ID or Secret is missing in environment variables.");
// }

// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/auth/google/callback"
// );

// module.exports = { oauth2Client };

const { google } = require("googleapis");

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("WARNING: Google Client ID or Secret is missing in environment variables.");
}

// DEBUG: Log what we're using
const redirectUri = "https://inboxiq-orjq.onrender.com/auth/google/callback";
console.log("Using redirect URI:", redirectUri);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri  // Hardcoded — bypass env var issues
);

module.exports = { oauth2Client };