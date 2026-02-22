const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  userEmail: String,
  messageId: String,
  threadId: String,
  subject: String,
  body: String,
  embedding: [Number],
  createdAt: Date
});

module.exports = mongoose.model("Email", emailSchema);