const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  userEmail: { type: String, index: true },
  messageId: { type: String, unique: true },
  threadId: String,
  subject: String,
  from: String,
  to: String,
  date: String,
  category: { type: String, default: "Uncategorized" },
  isSent: { type: Boolean, default: false },
  body: String,
  html: String,
  embedding: [Number],
  attachments: [
    {
      attachmentId: String,
      filename: String,
      mimeType: String,
      size: Number,
    },
  ],
  createdAt: Date,
});

module.exports = mongoose.model("Email", emailSchema);