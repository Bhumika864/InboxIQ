const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, index: true, trim: true, lowercase: true },
    messageId: { type: String, required: true },
    threadId: String,
    subject: String,
    from: String,
    to: String,
    date: String,
    category: { type: String, default: "Uncategorized" },
    isSent: { type: Boolean, default: false },
    isRead: { type: Boolean, default: true },
    isStarred: { type: Boolean, default: false },
    labelIds: [String],
    snippet: String,
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
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailSchema.index({ userEmail: 1, messageId: 1 }, { unique: true });
emailSchema.index({ userEmail: 1, createdAt: -1 });
emailSchema.index({ userEmail: 1, category: 1, createdAt: -1 });
emailSchema.index({ userEmail: 1, threadId: 1, createdAt: -1 });
emailSchema.index({ userEmail: 1, isRead: 1, createdAt: -1 });
emailSchema.index({ userEmail: 1, isStarred: 1, createdAt: -1 });

module.exports = mongoose.model("Email", emailSchema);