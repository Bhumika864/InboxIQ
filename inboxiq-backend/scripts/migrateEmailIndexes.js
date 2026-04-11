require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Email = require("../models/Email");

const keysEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const migrateEmailIndexes = async () => {
  await connectDB();

  const collection = Email.collection;
  const existingIndexes = await collection.indexes();

  const legacyMessageIdUniqueIndex = existingIndexes.find(
    (index) => index.unique === true && keysEqual(index.key, { messageId: 1 })
  );

  if (legacyMessageIdUniqueIndex) {
    await collection.dropIndex(legacyMessageIdUniqueIndex.name);
    console.log(`Dropped legacy index: ${legacyMessageIdUniqueIndex.name}`);
  } else {
    console.log("No legacy global messageId unique index found.");
  }

  const hasCompoundUniqueIndex = existingIndexes.some(
    (index) =>
      index.unique === true &&
      keysEqual(index.key, { userEmail: 1, messageId: 1 })
  );

  if (!hasCompoundUniqueIndex) {
    await collection.createIndex(
      { userEmail: 1, messageId: 1 },
      { unique: true, name: "userEmail_1_messageId_1" }
    );
    console.log("Created index: userEmail_1_messageId_1 (unique)");
  } else {
    console.log("Compound unique index already exists.");
  }

  await collection.createIndex(
    { userEmail: 1, createdAt: -1 },
    { name: "userEmail_1_createdAt_-1" }
  );
  await collection.createIndex(
    { userEmail: 1, category: 1, createdAt: -1 },
    { name: "userEmail_1_category_1_createdAt_-1" }
  );
  await collection.createIndex(
    { userEmail: 1, threadId: 1, createdAt: -1 },
    { name: "userEmail_1_threadId_1_createdAt_-1" }
  );
  await collection.createIndex(
    { userEmail: 1, isRead: 1, createdAt: -1 },
    { name: "userEmail_1_isRead_1_createdAt_-1" }
  );
  await collection.createIndex(
    { userEmail: 1, isStarred: 1, createdAt: -1 },
    { name: "userEmail_1_isStarred_1_createdAt_-1" }
  );
  console.log("Verified query indexes for email listing/filtering.");
};

migrateEmailIndexes()
  .then(async () => {
    await mongoose.connection.close();
    console.log("Email index migration completed.");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Email index migration failed:", err.message);
    await mongoose.connection.close();
    process.exit(1);
  });
