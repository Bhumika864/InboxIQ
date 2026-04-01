const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required but was not provided.");
  }

  mongoose.set("strictQuery", true);

  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  console.log(`MongoDB Connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
