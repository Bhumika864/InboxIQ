
// const express = require("express");
// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const emailRoutes = require("./routes/emailRoutes");

// dotenv.config();
// console.log("ID:", process.env.GOOGLE_CLIENT_ID);
// console.log("SECRET:", process.env.GOOGLE_CLIENT_SECRET);
// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use("/email", emailRoutes);
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("Mongo Connected"))
//   .catch(err => console.log(err));

// app.get("/", (req, res) => {
//   res.send("InboxIQ API running");
// });

// const authRoutes = require("./routes/authRoutes");
// app.use("/auth", authRoutes);

// app.listen(5000, () => {
//   console.log("Server running on port 5000");
// });



const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");

dotenv.config();

const app = express();

// =====================
// MIDDLEWARE
// =====================
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5176"],
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "inboxiq_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
  },
}));

// =====================
// ROUTES
// =====================
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");

app.use("/auth", authRoutes);
app.use("/email", emailRoutes);

app.get("/", (req, res) => {
  res.send("InboxIQ API running");
});

// =====================
// DB + SERVER
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(5000, () => console.log("Server running on http://localhost:5000"));
  })
  .catch((err) => console.error("Mongo error:", err));