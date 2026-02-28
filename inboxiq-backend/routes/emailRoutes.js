
// require("dotenv").config();

// const express = require("express");
// const router = express.Router();
// const { google } = require("googleapis");
// const Groq = require("groq-sdk");
// const { convert } = require("html-to-text");
// const { embed } = require("../utils/embedding");

// const User = require("../models/User");
// const Email = require("../models/Email");

// console.log("EMAIL ROUTES FILE LOADED");

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });
// console.log("Groq key exists:", !!process.env.GROQ_API_KEY);

// // =====================
// // HELPERS
// // =====================

// function extractBody(payload) {
//   if (!payload) return "";

//   let plainText = "";
//   let htmlText = "";

//   function walk(parts) {
//     for (let part of parts) {
//       if (part.mimeType === "text/plain" && part.body?.data) {
//         plainText = Buffer.from(part.body.data, "base64").toString("utf-8");
//       }
//       if (part.mimeType === "text/html" && part.body?.data) {
//         htmlText = Buffer.from(part.body.data, "base64").toString("utf-8");
//       }
//       if (part.parts) {
//         walk(part.parts);
//       }
//     }
//   }

//   if (payload.parts) {
//     walk(payload.parts);
//   } else if (payload.body?.data) {
//     plainText = Buffer.from(payload.body.data, "base64").toString("utf-8");
//   }

//   // Prefer plain text if it has enough content
//   if (plainText && plainText.trim().length > 50) {
//     return plainText;
//   }

//   // Fall back to HTML → convert to text
//   if (htmlText) {
//     return convert(htmlText, {
//       wordwrap: 120,
//       selectors: [
//         { selector: "img", format: "skip" },
//         { selector: "a", options: { ignoreHref: true } },
//       ],
//     });
//   }

//   return "";
// }

// function cleanEmailText(rawText) {
//   if (!rawText) return "";

//   return rawText
//     .replace(/https?:\/\/\S+/g, "")         // remove http/https URLs
//     .replace(/www\.\S+/g, "")               // remove www links
//     .replace(/\[.*?\]\s*/g, "")             // remove leftover [link] brackets
//     .replace(/=[a-zA-Z0-9]{2}/g, "")        // remove quoted-printable artifacts (e.g. =3D)
//     .replace(/[^\S\r\n]{2,}/g, " ")         // collapse multiple spaces
//     .replace(/(\r?\n){3,}/g, "\n\n")        // collapse excess blank lines
//     .trim();
// }

// // =====================
// // ROUTES
// // =====================

// router.get("/clear", async (req, res) => {
//   const result = await Email.deleteMany({});
//   res.send("Deleted: " + result.deletedCount);
// });

// router.get("/db-check", async (req, res) => {
//   const count = await Email.countDocuments();
//   res.send("Email count: " + count);
// });

// // =====================
// // SYNC EMAILS
// // =====================
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
//       refresh_token: user.refreshToken,
//     });

//     const gmail = google.gmail({ version: "v1", auth: client });

//     const list = await gmail.users.messages.list({
//       userId: "me",
//       maxResults: 50,
//     });

//     const messages = list.data.messages || [];

//     for (let msg of messages) {
//       const full = await gmail.users.messages.get({
//         userId: "me",
//         id: msg.id,
//         format: "full",
//       });

//       const headers = full.data.payload.headers;
//       const subjectHeader = headers.find((h) => h.name === "Subject");
//       const subject = subjectHeader ? subjectHeader.value : "";

//       // Extract and clean the body — FIX: cleanEmailText is now applied
//       const rawBody = extractBody(full.data.payload);
//       const body = cleanEmailText(rawBody);

//       const embedding = await embed(subject + " " + body);

//       await Email.updateOne(
//         { messageId: msg.id },
//         {
//           userEmail,
//           messageId: msg.id,
//           threadId: full.data.threadId,
//           subject,
//           body,
//           embedding,
//           createdAt: new Date(parseInt(full.data.internalDate)),
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

// // =====================
// // LIST EMAILS
// // =====================
// router.get("/list/:email", async (req, res) => {
//   const emails = await Email.find({ userEmail: req.params.email })
//     .sort({ createdAt: -1 })
//     .limit(20);

//   res.json(emails);
// });

// // =====================
// // ASK INBOXIQ (Vector RAG + Groq)
// // =====================
// router.post("/ask", async (req, res) => {
//   try {
//     console.log("ASK ROUTE HIT");

//     const { email, question } = req.body;

//     if (!email || !question) {
//       return res.status(400).json({ error: "Missing fields" });
//     }

//     // 1. Fetch all stored emails
//     const allEmails = await Email.find({ userEmail: email });

//     if (!allEmails.length) {
//       return res.status(404).json({ error: "No emails found" });
//     }

//     // 2. Embed the user question
//     const questionEmbedding = await embed(question);

//     // 3. Cosine similarity
//     function cosineSimilarity(a, b) {
//       const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
//       const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
//       const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
//       return dot / (normA * normB);
//     }

//     // 4. Score each email
//     const scored = allEmails.map((e) => ({
//       ...e._doc,
//       score: cosineSimilarity(questionEmbedding, e.embedding),
//     }));

//     // 5. Sort and take top 3
//     scored.sort((a, b) => b.score - a.score);
//     const topEmails = scored.slice(0, 3);

//     // 6. Build context
//     const context = topEmails
//       .map(
//         (e, i) =>
//           `Email ${i + 1}:\nSubject: ${e.subject}\nBody: ${e.body.slice(0, 800)}`
//       )
//       .join("\n\n");

//     // 7. Send to Groq
//     const completion = await groq.chat.completions.create({
//       model: "llama-3.1-8b-instant",
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are an AI email assistant. Answer strictly using the provided emails. If the answer is not present, say you cannot find it.",
//         },
//         {
//           role: "user",
//           content: `User question: ${question}\n\nRelevant Emails:\n${context}`,
//         },
//       ],
//     });

//     const answer = completion.choices[0].message.content;
//     res.json({ answer });
//   } catch (error) {
//     console.error("ASK ERROR:", error);
//     res.status(500).json({ error: "Ask failed" });
//   }
// });

// module.exports = router;



require("dotenv").config();

const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const Groq = require("groq-sdk");
const { convert } = require("html-to-text");
const { embed } = require("../utils/embedding");

const User = require("../models/User");
const Email = require("../models/Email");

console.log("EMAIL ROUTES FILE LOADED");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =====================
// HELPERS
// =====================

function extractBody(payload) {
  if (!payload) return "";

  let plainText = "";
  let htmlText = "";

  function walk(parts) {
    for (let part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data)
        plainText = Buffer.from(part.body.data, "base64").toString("utf-8");
      if (part.mimeType === "text/html" && part.body?.data)
        htmlText = Buffer.from(part.body.data, "base64").toString("utf-8");
      if (part.parts) walk(part.parts);
    }
  }

  if (payload.parts) walk(payload.parts);
  else if (payload.body?.data)
    plainText = Buffer.from(payload.body.data, "base64").toString("utf-8");

  if (plainText && plainText.trim().length > 50) return plainText;

  if (htmlText) {
    return convert(htmlText, {
      wordwrap: 120,
      selectors: [
        { selector: "img", format: "skip" },
        { selector: "a", options: { ignoreHref: true } },
      ],
    });
  }

  return "";
}

function cleanEmailText(rawText) {
  if (!rawText) return "";
  return rawText
    .replace(/https?:\/\/\S+/g, "")
    .replace(/www\.\S+/g, "")
    .replace(/\[.*?\]\s*/g, "")
    .replace(/=[a-zA-Z0-9]{2}/g, "")
    .replace(/[^\S\r\n]{2,}/g, " ")
    .replace(/(\r?\n){3,}/g, "\n\n")
    .trim();
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

// =====================
// DEV UTILITIES
// =====================

router.get("/clear", async (req, res) => {
  const result = await Email.deleteMany({});
  res.send("Deleted: " + result.deletedCount);
});

router.get("/db-check", async (req, res) => {
  const count = await Email.countDocuments();
  res.send("Email count: " + count);
});

// =====================
// SYNC EMAILS
// =====================
router.get("/sync/:email", async (req, res) => {
  try {
    const userEmail = req.params.email;

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).send("User not found");

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({ refresh_token: user.refreshToken });

    const gmail = google.gmail({ version: "v1", auth: client });

    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
    });

    const messages = list.data.messages || [];

    for (let msg of messages) {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = full.data.payload.headers;

      const subject = headers.find((h) => h.name === "Subject")?.value || "";
      const from    = headers.find((h) => h.name === "From")?.value || "";
      const to      = headers.find((h) => h.name === "To")?.value || "";
      const date    = headers.find((h) => h.name === "Date")?.value || "";

      const rawBody = extractBody(full.data.payload);
      const body = cleanEmailText(rawBody);

      const embedding = await embed(subject + " " + body);

      await Email.updateOne(
        { messageId: msg.id },
        {
          userEmail,
          messageId: msg.id,
          threadId: full.data.threadId,
          subject,
          from,
          to,
          date,
          body,
          embedding,
          createdAt: new Date(parseInt(full.data.internalDate)),
        },
        { upsert: true }
      );
    }

    res.json({ message: "Emails synced", count: messages.length });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).send("Sync failed");
  }
});

// =====================
// LIST EMAILS
// =====================
router.get("/list/:email", async (req, res) => {
  try {
    const emails = await Email.find({ userEmail: req.params.email })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("-embedding"); // don't send embedding array to frontend

    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// =====================
// GET SINGLE EMAIL
// =====================
router.get("/message/:id", async (req, res) => {
  try {
    const email = await Email.findOne({ messageId: req.params.id }).select("-embedding");
    if (!email) return res.status(404).json({ error: "Email not found" });
    res.json(email);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch email" });
  }
});

// =====================
// SEMANTIC SEARCH (ASK)
// =====================
router.post("/ask", async (req, res) => {
  try {
    console.log("ASK ROUTE HIT");
    const { email, question } = req.body;

    if (!email || !question)
      return res.status(400).json({ error: "Missing email or question" });

    const allEmails = await Email.find({ userEmail: email });
    if (!allEmails.length)
      return res.status(404).json({ error: "No emails found. Please sync first." });

    const questionEmbedding = await embed(question);

    const scored = allEmails
      .map((e) => ({
        ...e._doc,
        score: cosineSimilarity(questionEmbedding, e.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const context = scored
      .map(
        (e, i) =>
          `Email ${i + 1}:\nFrom: ${e.from || "Unknown"}\nSubject: ${e.subject}\nDate: ${e.date || ""}\nBody: ${e.body.slice(0, 800)}`
      )
      .join("\n\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are InboxIQ, an AI email assistant. Answer the user's question using only the provided emails. Be concise and helpful. If the answer isn't in the emails, say so clearly.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nRelevant Emails:\n${context}`,
        },
      ],
    });

    const answer = completion.choices[0].message.content;

    // Return answer + the matched emails (without embeddings) for UI display
    const matchedEmails = scored.map(({ embedding, ...rest }) => rest);

    res.json({ answer, matchedEmails });
  } catch (error) {
    console.error("ASK ERROR:", error);
    res.status(500).json({ error: "Ask failed" });
  }
});

// =====================
// GENERATE AI REPLY
// =====================
router.post("/reply", async (req, res) => {
  try {
    const { messageId, tone, userEmail } = req.body;
    // tone: "formal" | "casual" | "short" | "detailed"

    if (!messageId || !tone)
      return res.status(400).json({ error: "Missing messageId or tone" });

    const email = await Email.findOne({ messageId });
    if (!email) return res.status(404).json({ error: "Email not found" });

    const toneInstructions = {
      formal:   "Write a professional and formal reply.",
      casual:   "Write a friendly and casual reply.",
      short:    "Write a very brief reply in 2-3 sentences.",
      detailed: "Write a thorough and detailed reply covering all points.",
    };

    const instruction = toneInstructions[tone] || toneInstructions.formal;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are an AI email reply assistant. ${instruction} Reply only with the email body — no subject line, no extra explanation.`,
        },
        {
          role: "user",
          content: `Original Email:\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body.slice(0, 1000)}\n\nGenerate a reply:`,
        },
      ],
    });

    const reply = completion.choices[0].message.content;

    res.json({
      reply,
      replyTo: email.from,
      subject: `Re: ${email.subject}`,
    });
  } catch (error) {
    console.error("REPLY ERROR:", error);
    res.status(500).json({ error: "Reply generation failed" });
  }
});

module.exports = router;