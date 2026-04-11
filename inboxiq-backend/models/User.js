const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    accessToken: String,
    refreshToken: String,
    aiSearchCount: { type: Number, default: 0 },
    aiReplyCount: { type: Number, default: 0 },
    resetDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);