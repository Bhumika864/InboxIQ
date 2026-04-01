const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  userEmail: { type: String, index: true },
  messageId: { type: String, unique: true },
  threadId: String,
  subject: String,
  from: String,
  to: String,
  date: String,
  body: String,
  html: String,
  embedding: [Number],
  createdAt: Date,
});

module.exports = mongoose.model("Email", emailSchema);