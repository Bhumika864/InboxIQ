
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const emailRoutes = require("./routes/emailRoutes");

dotenv.config();
console.log("ID:", process.env.GOOGLE_CLIENT_ID);
console.log("SECRET:", process.env.GOOGLE_CLIENT_SECRET);
const app = express();
app.use(cors());
app.use(express.json());
app.use("/email", emailRoutes);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo Connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("InboxIQ API running");
});

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});