const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  accessToken: String,
  refreshToken: String,
  aiSearchCount: { type: Number, default: 0 },
  aiReplyCount: { type: Number, default: 0 },
  resetDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);