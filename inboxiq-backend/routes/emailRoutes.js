// require("dotenv").config();
// const express = require("express");
// const router = express.Router();
// const { google } = require("googleapis");
// const User = require("../models/User");
// const Email = require("../models/Email");
// const OpenAI = require("openai");
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });
// console.log("OpenAI key exists:", !!process.env.OPENAI_API_KEY);
// router.get("/sync/:email", async (req, res) => {
//   try {
//     const userEmail = req.params.email;

//     const user = await User.findOne({ email: userEmail });
//     if (!user) return res.status(404).send("User not found");

//     const client = new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET
//     );

//     client.setCredentials({
//       refresh_token: user.refreshToken
//     });

//     const gmail = google.gmail({
//       version: "v1",
//       auth: client
//     });

//     const list = await gmail.users.messages.list({
//       userId: "me",
//       maxResults: 5   // keep small for now
//     });

//     const messages = list.data.messages || [];

//     for (let msg of messages) {
//       const full = await gmail.users.messages.get({
//         userId: "me",
//         id: msg.id
//       });

//       const headers = full.data.payload.headers;

//       const subjectHeader = headers.find(h => h.name === "Subject");
//       const subject = subjectHeader ? subjectHeader.value : "";

//       const body = full.data.snippet;

//       const content = subject + " " + body;

//       const embeddingResponse = await openai.embeddings.create({
//         model: "text-embedding-3-small",
//         input: content,
//       });


//       const embedding = Array.from({ length: 1536 }, () => Math.random());

//       await Email.updateOne(
//         { messageId: msg.id },
//         {
//           userEmail,
//           messageId: msg.id,
//           threadId: full.data.threadId,
//           subject,
//           body,
//           embedding,
//           createdAt: new Date(parseInt(full.data.internalDate))
//         },
//         { upsert: true }
//       );
//     }

//     res.send("Emails synced");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Sync failed");
//   }
// });
// module.exports = router;


require("dotenv").config();

const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const User = require("../models/User");
const Email = require("../models/Email");

router.get("/sync/:email", async (req, res) => {
  try {
    const userEmail = req.params.email;

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).send("User not found");

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
      refresh_token: user.refreshToken
    });

    const gmail = google.gmail({
      version: "v1",
      auth: client
    });

    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5
    });

    const messages = list.data.messages || [];

    for (let msg of messages) {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id
      });

      const headers = full.data.payload.headers;

      const subjectHeader = headers.find(h => h.name === "Subject");
      const subject = subjectHeader ? subjectHeader.value : "";

      const body = full.data.snippet;

      // MOCK embedding (1536 dimension)
      const embedding = Array.from({ length: 1536 }, () => Math.random());

      await Email.updateOne(
        { messageId: msg.id },
        {
          userEmail,
          messageId: msg.id,
          threadId: full.data.threadId,
          subject,
          body,
          embedding,
          createdAt: new Date(parseInt(full.data.internalDate))
        },
        { upsert: true }
      );
    }

    res.send("Emails synced");
  } catch (error) {
    console.error(error);
    res.status(500).send("Sync failed");
  }
});

router.get("/list/:email", async (req, res) => {
  const emails = await Email.find({ userEmail: req.params.email })
    .sort({ createdAt: -1 })
    .limit(5);

  res.json(emails);
});
router.get("/db-check", async (req, res) => {
  const count = await Email.countDocuments();
  res.send("Email count: " + count);
});
router.get("/clear", async (req, res) => {
  const result = await Email.deleteMany({});
  res.send("Deleted: " + result.deletedCount);
});
module.exports = router;