const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const Groq = require("groq-sdk");
const { convert } = require("html-to-text");
const { embed } = require("../utils/embedding");

const User = require("../models/User");
const Email = require("../models/Email");

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

router.get("/clear", async (req, res, next) => {
  try {
    const result = await Email.deleteMany({});
    res.json({ message: "Deleted emails", count: result.deletedCount });
  } catch (err) {
    next(err);
  }
});

router.get("/db-check", async (req, res, next) => {
  try {
    const count = await Email.countDocuments();
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// =====================
// SYNC EMAILS
// =====================
router.get("/sync/:email", async (req, res, next) => {
  try {
    const userEmail = req.params.email;
    console.log(`[Sync] Request for: ${userEmail}`);

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`[Sync] User not found: ${userEmail}`);
      res.status(404);
      throw new Error("User not found");
    }

    if (!user.refreshToken) {
      console.error(`[Sync] Refresh token missing for: ${userEmail}`);
      res.status(400);
      throw new Error("Refresh token missing. Please log in again.");
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({ refresh_token: user.refreshToken });

    const gmail = google.gmail({ version: "v1", auth: client });

    console.log(`[Sync] Fetching messages from Gmail for ${userEmail}...`);
    let list;
    try {
      list = await gmail.users.messages.list({
        userId: "me",
        maxResults: 100,
      });
    } catch (gmailError) {
      console.error(`[Sync] Gmail API list error:`, gmailError.message);
      if (gmailError.code === 401 || gmailError.code === 403) {
        res.status(401);
        throw new Error("Google authentication failed. Please log in again.");
      }
      throw gmailError;
    }

    const messages = list.data.messages || [];
    console.log(`[Sync] Found ${messages.length} messages.`);

    for (let msg of messages) {
      try {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
        });

        const headers = full.data.payload.headers;
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const from = headers.find((h) => h.name === "From")?.value || "";
        const to = headers.find((h) => h.name === "To")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        const rawBody = extractBody(full.data.payload);
        const body = cleanEmailText(rawBody);

        console.log(`[Sync] Embedding & Saving: ${subject.substring(0, 30)}`);
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
            createdAt: new Date(parseInt(full.data.internalDate)) || new Date(),
          },
          { upsert: true }
        );
      } catch (msgError) {
        console.error(`[Sync] Error processing message ${msg.id}:`, msgError.message);
        // Continue to next message instead of failing entire sync
        continue;
      }
    }

    console.log(`[Sync] Success for ${userEmail}`);
    res.json({ message: "Emails synced", count: messages.length });
  } catch (error) {
    console.error(`[Sync] Global sync error:`, error);
    next(error);
  }
});

// =====================
// LIST EMAILS (with pagination)
// =====================
router.get("/list/:email", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const emails = await Email.find({ userEmail: req.params.email })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-embedding");

    res.json(emails);
  } catch (err) {
    next(err);
  }
});

// =====================
// GET SINGLE EMAIL
// =====================
router.get("/message/:id", async (req, res, next) => {
  try {
    const email = await Email.findOne({ messageId: req.params.id }).select("-embedding");
    if (!email) {
      res.status(404);
      throw new Error("Email not found");
    }
    res.json(email);
  } catch (err) {
    next(err);
  }
});

// =====================
// SEMANTIC SEARCH (ASK)
// =====================
router.post("/ask", async (req, res, next) => {
  try {
    const { email, question } = req.body;

    if (!email || !question) {
      res.status(400);
      throw new Error("Missing email or question");
    }

    const allEmails = await Email.find({ userEmail: email });
    if (!allEmails.length) {
      res.status(404);
      throw new Error("No emails found. Please sync first.");
    }

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
    const matchedEmails = scored.map(({ embedding, ...rest }) => rest);

    res.json({ answer, matchedEmails });
  } catch (error) {
    next(error);
  }
});

// =====================
// GENERATE AI REPLY
// =====================
router.post("/reply", async (req, res, next) => {
  try {
    const { messageId, tone } = req.body;

    if (!messageId || !tone) {
      res.status(400);
      throw new Error("Missing messageId or tone");
    }

    const email = await Email.findOne({ messageId });
    if (!email) {
      res.status(404);
      throw new Error("Email not found");
    }

    const toneInstructions = {
      formal: "Write a professional and formal reply.",
      casual: "Write a friendly and casual reply.",
      short: "Write a very brief reply in 2-3 sentences.",
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
    next(error);
  }
});

module.exports = router;
