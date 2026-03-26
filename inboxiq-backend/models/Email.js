// const mongoose = require("mongoose");

// const emailSchema = new mongoose.Schema({
//   userEmail: String,
//   messageId: String,
//   threadId: String,
//   subject: String,
//   body: String,
//   embedding: [Number],
//   createdAt: Date
// });

// module.exports = mongoose.model("Email", emailSchema);


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
  embedding: [Number],
  createdAt: Date,
});

module.exports = mongoose.model("Email", emailSchema);