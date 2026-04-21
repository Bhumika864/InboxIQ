const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const Groq = require("groq-sdk");
const { convert } = require("html-to-text");
const { embed } = require("../utils/embedding");
const { heavyOpsLimiter } = require("../middleware/rateLimitMiddleware");
const { validateRequiredFields } = require("../middleware/validationMiddleware");

const User = require("../models/User");
const Email = require("../models/Email");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =====================
// HELPERS
// =====================

function extractBody(payload) {
  if (!payload) return { text: "", html: "" };

  let plainText = "";
  let htmlText = "";

  const decodeBase64 = (data) => {
    if (!data) return "";
    // Gmail uses URL-safe base64
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  };

  function walk(parts) {
    for (let part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        plainText = decodeBase64(part.body.data);
      }
      if (part.mimeType === "text/html" && part.body?.data) {
        htmlText = decodeBase64(part.body.data);
      }
      if (part.parts) walk(part.parts);
    }
  }

  if (payload.parts) walk(payload.parts);
  else if (payload.mimeType === "text/plain" && payload.body?.data) {
    plainText = decodeBase64(payload.body.data);
  } else if (payload.mimeType === "text/html" && payload.body?.data) {
    htmlText = decodeBase64(payload.body.data);
  }

  // Fallback if no parts found but data exists at root
  if (!plainText && !htmlText && payload.body?.data) {
    if (payload.mimeType === "text/html") {
      htmlText = decodeBase64(payload.body.data);
    } else {
      plainText = decodeBase64(payload.body.data);
    }
  }

  // If no plain text was found, convert HTML to text for the AI
  let textForAI = plainText;
  if (!textForAI && htmlText) {
    textForAI = convert(htmlText, {
      wordwrap: 120,
      selectors: [
        { selector: "img", format: "skip" },
        { selector: "a", options: { ignoreHref: true } },
      ],
    });
  }

  return { text: textForAI || "", html: htmlText || plainText || "" };
}

function extractAttachments(payload) {
  const attachments = [];

  function walk(parts) {
    for (let part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
        });
      }
      if (part.parts) walk(part.parts);
    }
  }

  if (payload.parts) walk(payload.parts);

  return attachments;
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

function buildEmailEmbeddingInput({ subject = "", from = "", snippet = "", body = "" }) {
  const cleanSubject = String(subject || "").trim();
  const cleanFrom = String(from || "").trim();
  const cleanSnippet = String(snippet || "").trim();
  const cleanBody = String(body || "").trim();

  return [
    `Subject: ${cleanSubject}`,
    `From: ${cleanFrom}`,
    `Snippet: ${cleanSnippet}`,
    `Subject: ${cleanSubject}`,
    `From: ${cleanFrom}`,
    `Body: ${cleanBody}`,
  ]
    .join(" ")
    .trim() || "Empty email";
}

async function createEmailEmbedding(emailData) {
  const embedding = await embed(buildEmailEmbeddingInput(emailData));

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding model returned an empty vector");
  }

  return embedding;
}

function getAuthorizedEmail(req) {
  return req.user?.email ? String(req.user.email).toLowerCase() : null;
}

function assertEmailAccess(req, candidateEmail) {
  const authorizedEmail = getAuthorizedEmail(req);
  const normalizedCandidate = candidateEmail
    ? String(candidateEmail).trim().toLowerCase()
    : null;
  if (!authorizedEmail) {
    const err = new Error("Not authorized");
    err.statusCode = 401;
    throw err;
  }
  if (normalizedCandidate && normalizedCandidate !== authorizedEmail) {
    const err = new Error("Forbidden: email does not match authenticated user");
    err.statusCode = 403;
    throw err;
  }
  return authorizedEmail;
}

async function getGmailClientForUserEmail(userEmail) {
  const user = await User.findOne({ email: userEmail });
  if (!user || !user.refreshToken) {
    const err = new Error("User not authenticated or refresh token missing");
    err.statusCode = 401;
    throw err;
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: user.refreshToken });

  return google.gmail({ version: "v1", auth: client });
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

async function categorizeEmail(subject, body) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are an email categorization AI. Classify the email into one of these categories: Important, Promotions, Social, Newsletters, Spam, Uncategorized. Respond with only the category name.",
        },
        {
          role: "user",
          content: `Subject: ${subject}\n\nBody: ${body.slice(0, 500)}`,
        },
      ],
      temperature: 0,
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("[Categorize] Error categorizing email:", error.message);
    return "Uncategorized"; // Fallback category
  }
}

// =====================
// DEV UTILITIES
// =====================

router.get("/clear", async (req, res, next) => {
  try {
    const authorizedEmail = assertEmailAccess(req);
    const result = await Email.deleteMany({ userEmail: authorizedEmail });
    res.json({ message: "Deleted emails", count: result.deletedCount });
  } catch (err) {
    next(err);
  }
});

router.get("/db-check", async (req, res, next) => {
  try {
    const authorizedEmail = assertEmailAccess(req);
    const count = await Email.countDocuments({ userEmail: authorizedEmail });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// =====================
// SYNC EMAILS
// =====================
router.get("/sync/:email", heavyOpsLimiter, async (req, res, next) => {
  try {
    const userEmail = assertEmailAccess(req, req.params.email);
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
        maxResults: 500,
        q: "label:INBOX OR label:SENT",
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

        const isSent = full.data.labelIds?.includes("SENT") || from.includes(userEmail);
        const labelIds = full.data.labelIds || [];
        const isRead = !labelIds.includes("UNREAD");
        const isStarred = labelIds.includes("STARRED");
        const snippet = full.data.snippet || "";

        const { text, html } = extractBody(full.data.payload);
        const body = cleanEmailText(text);
        const attachments = extractAttachments(full.data.payload);

        console.log(`[Sync] Embedding & Saving: ${subject.substring(0, 30)}`);
        const embedding = await createEmailEmbedding({ subject, from, snippet, body });
        const category = await categorizeEmail(subject, body);

        await Email.updateOne(
          { userEmail, messageId: msg.id },
          {
            userEmail,
            messageId: msg.id,
            threadId: full.data.threadId,
            subject,
            from,
            to,
            date,
            category,
            isSent,
            isRead,
            isStarred,
            labelIds,
            snippet,
            body,
            html,
            embedding,
            attachments,
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
    const userEmail = assertEmailAccess(req, req.params.email);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const emails = await Email.find({ userEmail })
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
    const userEmail = assertEmailAccess(req);
    const email = await Email.findOne({ messageId: req.params.id, userEmail }).select("-embedding");
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
// GET THREAD MESSAGES
// =====================
router.get("/thread/:threadId", async (req, res, next) => {
  try {
    const userEmail = assertEmailAccess(req, req.query.email);
    const { threadId } = req.params;

    if (!threadId) {
      res.status(400);
      throw new Error("Missing threadId");
    }

    const threadEmails = await Email.find({ userEmail, threadId })
      .sort({ createdAt: 1 })
      .select("-embedding");

    res.json(threadEmails);
  } catch (err) {
    next(err);
  }
});

// =====================
// TOGGLE READ STATUS
// =====================
router.post(
  "/mark-read",
  validateRequiredFields("body", ["email", "messageId", "isRead"]),
  async (req, res, next) => {
    try {
      const { email, messageId, isRead } = req.body;
      const userEmail = assertEmailAccess(req, email);
      const gmail = await getGmailClientForUserEmail(userEmail);

      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: isRead ? [] : ["UNREAD"],
          removeLabelIds: isRead ? ["UNREAD"] : [],
        },
      });

      const updated = await Email.findOneAndUpdate(
        { userEmail, messageId },
        { isRead: !!isRead },
        { new: true }
      ).select("-embedding");

      if (!updated) {
        res.status(404);
        throw new Error("Email not found");
      }

      res.json({ message: "Read status updated", email: updated });
    } catch (err) {
      next(err);
    }
  }
);

// =====================
// TOGGLE STAR STATUS
// =====================
router.post(
  "/mark-star",
  validateRequiredFields("body", ["email", "messageId", "isStarred"]),
  async (req, res, next) => {
    try {
      const { email, messageId, isStarred } = req.body;
      const userEmail = assertEmailAccess(req, email);
      const gmail = await getGmailClientForUserEmail(userEmail);

      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: isStarred ? ["STARRED"] : [],
          removeLabelIds: isStarred ? [] : ["STARRED"],
        },
      });

      const updated = await Email.findOneAndUpdate(
        { userEmail, messageId },
        { isStarred: !!isStarred },
        { new: true }
      ).select("-embedding");

      if (!updated) {
        res.status(404);
        throw new Error("Email not found");
      }

      res.json({ message: "Star status updated", email: updated });
    } catch (err) {
      next(err);
    }
  }
);

// =====================
// SEMANTIC SEARCH (ASK)
// =====================
router.post(
  "/ask",
  heavyOpsLimiter,
  validateRequiredFields("body", ["email", "question"]),
  async (req, res, next) => {
    try {
      const { email, question } = req.body;
      const authorizedEmail = assertEmailAccess(req, email);

      console.log(`[Ask] Query from ${authorizedEmail}: "${question}"`);

      const allEmails = await Email.find({ userEmail: authorizedEmail }).lean();
      if (!allEmails.length) {
        return res.status(404).json({ message: "No emails found. Please sync first." });
      }

      let questionEmbedding;
      try {
        questionEmbedding = await embed(question);
        console.log(`[Ask] Question embedded successfully (Vector size: ${questionEmbedding?.length})`);
      } catch (embedErr) {
        console.error("[Ask] Embedding failed:", embedErr.message);
        throw new Error("Failed to process your question. AI model may be initializing.");
      }

      // Simple keyword extraction for boosting
      const keywords = question
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 2);

      const scored = allEmails
        .filter((e) => e.embedding && Array.isArray(e.embedding) && e.embedding.length > 0)
        .map((e) => {
          try {
            const semanticScore = cosineSimilarity(questionEmbedding, e.embedding);

            // Keyword boosting: check if any query keywords are in the subject or body
            let keywordBoost = 0;
            const subjectLower = (e.subject || "").toLowerCase();
            const bodyLower = (e.body || "").toLowerCase();
            const fromLower = (e.from || "").toLowerCase();

            keywords.forEach((word) => {
              const isNumber = /^\d+$/.test(word);
              const boostAmount = isNumber ? 0.3 : 0.1;

              if (subjectLower.includes(word)) keywordBoost += boostAmount;
              if (fromLower.includes(word)) keywordBoost += boostAmount;
              if (bodyLower.includes(word)) keywordBoost += boostAmount * 0.2;
            });

            return {
              ...e,
              score: (isNaN(semanticScore) ? 0 : semanticScore) + keywordBoost,
            };
          } catch (err) {
            return { ...e, score: 0 };
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Reduce to 5 for context size safety

      if (scored.length === 0) {
        return res.json({
          answer: "I couldn't find any relevant emails with valid embeddings. Try syncing your emails again.",
          matchedEmails: [],
        });
      }

      const context = scored
        .map((e, i) => {
          const bodySnippet = (e.body || "").slice(0, 800); // Reduce to 800
          return `Email ${i + 1}:\nFrom: ${e.from || "Unknown"}\nSubject: ${e.subject || "No Subject"}\nDate: ${e.date || ""}\nSnippet: ${e.snippet || ""}\nBody: ${bodySnippet}`;
        })
        .join("\n\n");

      let completion;
      try {
        console.log(`[Ask] Generating completion with Groq (Context length: ${context.length} chars)...`);
        completion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are InboxIQ, an AI email assistant. Your goal is to provide a direct and accurate answer to the user's question based ONLY on the provided emails.\n\n" +
                "GUIDELINES:\n" +
                "1. BE DIRECT: Do not list multiple similar emails if only one is relevant to the specific question (e.g., if the user asks for 'Contest 492', do not talk about 'Contest 491').\n" +
                "2. DATA EXTRACTION: Extract specific dates, times, names, and identifiers exactly as they appear in the most relevant email.\n" +
                "3. CHRONOLOGY: If the user asks for the 'latest' or 'recent' info, compare the 'Date' fields of the relevant emails.\n" +
                "4. IDENTIFIER MATCHING: Prioritize emails where the query terms (especially numbers) appear in the 'Subject' or 'From' fields.\n" +
                "5. UNCERTAINTY: If the specific answer is not found in the context, state that clearly. Do not hallucinate.",
            },
            {
              role: "user",
              content: `Question: ${question}\n\nRelevant Emails Context:\n${context}`,
            },
          ],
        });
      } catch (groqErr) {
        console.error("[Ask] Groq API error:", groqErr.message);
        res.status(503); // Service Unavailable
        throw new Error("AI service is currently busy or unavailable. Please try again in a moment.");
      }

      if (!completion?.choices?.length) {
        console.error("[Ask] No choices returned from Groq completion");
        res.status(500);
        throw new Error("AI assistant failed to generate a response. Please try again.");
      }

      const answer = completion.choices[0].message.content;
      const matchedEmails = scored.map((item) => {
        // Safe destructuring to remove embedding before sending to frontend
        const { embedding, ...rest } = item;
        return rest;
      });

      console.log("[Ask] Success: Answer generated");
      res.json({ answer, matchedEmails });
    } catch (error) {
      const statusCode = error.statusCode || res.statusCode || 500;
      if (statusCode >= 500) {
        console.error("[Ask] Unexpected Internal Error:", error);
      }
      res.status(statusCode).json({
        message: error.message || "Internal Server Error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });

// =====================
// BACKFILL MISSING EMBEDDINGS
// =====================
router.post("/embed-missing", heavyOpsLimiter, async (req, res, next) => {
  try {
    const userEmail = assertEmailAccess(req, req.body?.email);
    const emails = await Email.find({
      userEmail,
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } },
        { embedding: null },
      ],
    });

    let embedded = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        email.embedding = await createEmailEmbedding({
          subject: email.subject,
          from: email.from,
          snippet: email.snippet,
          body: email.body,
        });
        await email.save();
        embedded += 1;
      } catch (embedErr) {
        failed += 1;
        console.error(
          `[EmbedMissing] Failed for ${email.messageId}:`,
          embedErr.message
        );
      }
    }

    res.json({
      message: "Embedding backfill completed",
      checked: emails.length,
      embedded,
      failed,
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// GENERATE AI REPLY
// =====================
router.post(
  "/reply",
  heavyOpsLimiter,
  validateRequiredFields("body", ["messageId", "tone"]),
  async (req, res, next) => {
    try {
      const { messageId, tone } = req.body;
      const userEmail = assertEmailAccess(req);

      const email = await Email.findOne({ userEmail, messageId });
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

// =====================
// SEND EMAIL
// =====================
router.post(
  "/send",
  heavyOpsLimiter,
  validateRequiredFields("body", ["email", "to", "subject", "body"]),
  async (req, res, next) => {
    try {
      const { email, to, subject, body } = req.body;
      const authorizedEmail = assertEmailAccess(req, email);

      const user = await User.findOne({ email: authorizedEmail });
      if (!user || !user.refreshToken) {
        res.status(401);
        throw new Error("User not authenticated or refresh token missing");
      }

      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      client.setCredentials({ refresh_token: user.refreshToken });

      const gmail = google.gmail({ version: "v1", auth: client });

      // Gmail API requires the email to be base64url encoded
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const messageParts = [
        `To: ${to}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${utf8Subject}`,
        "",
        body,
      ];
      const message = messageParts.join("\n");

      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sentMessage = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      // Save to local database immediately so it shows in the "Sent" section
      const embedding = await createEmailEmbedding({
        subject,
        from: authorizedEmail,
        body,
      });
      const category = await categorizeEmail(subject, body);

      await Email.create({
        userEmail: authorizedEmail,
        messageId: sentMessage.data.id,
        threadId: sentMessage.data.threadId,
        subject,
        from: authorizedEmail, // Sender is the user
        to,
        date: new Date().toUTCString(),
        category,
        isSent: true,
        body,
        html: body, // Assuming HTML body for simplicity
        embedding,
        createdAt: new Date(),
      });

      res.json({ message: "Email sent successfully", messageId: sentMessage.data.id });
    } catch (error) {
      console.error("[Send] Error sending email:", error.message);
      next(error);
    }
  });

// =====================
// SAVE AS DRAFT
// =====================
router.post(
  "/draft",
  heavyOpsLimiter,
  validateRequiredFields("body", ["email", "to", "subject", "body"]),
  async (req, res, next) => {
    try {
      const { email, to, subject, body } = req.body;
      const authorizedEmail = assertEmailAccess(req, email);

      const user = await User.findOne({ email: authorizedEmail });
      if (!user || !user.refreshToken) {
        res.status(401);
        throw new Error("User not authenticated or refresh token missing");
      }

      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      client.setCredentials({ refresh_token: user.refreshToken });

      const gmail = google.gmail({ version: "v1", auth: client });

      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const messageParts = [
        `To: ${to}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${utf8Subject}`,
        "",
        body,
      ];
      const message = messageParts.join("\n");

      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      });

      res.json({ message: "Draft saved successfully" });
    } catch (error) {
      console.error("[Draft] Error saving draft:", error.message);
      next(error);
    }
  });

// =====================
// GET ATTACHMENT
// =====================
router.get("/attachment/:messageId/:attachmentId", async (req, res, next) => {
  try {
    const { messageId, attachmentId } = req.params;
    const userEmail = req.query.email;

    const authorizedEmail = assertEmailAccess(req, userEmail);

    const user = await User.findOne({ email: authorizedEmail });
    if (!user || !user.refreshToken) {
      res.status(401);
      throw new Error("User not authenticated or refresh token missing");
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({ refresh_token: user.refreshToken });

    const gmail = google.gmail({ version: "v1", auth: client });

    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: messageId,
      id: attachmentId,
    });

    res.json({ data: attachment.data.data });
  } catch (error) {
    console.error("[Attachment] Error fetching attachment:", error.message);
    next(error);
  }
});

// =====================
// BULK ACTIONS
// =====================
router.post(
  "/bulk-action",
  heavyOpsLimiter,
  validateRequiredFields("body", ["email", "action", "messageIds"]),
  async (req, res, next) => {
    try {
      const { email, action, messageIds } = req.body;
      const authorizedEmail = assertEmailAccess(req, email);
      const normalizedAction = String(action || "").trim().toLowerCase();
      const ids = Array.from(
        new Set(
          (Array.isArray(messageIds) ? messageIds : [])
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        )
      );

      if (!ids.length) {
        res.status(400);
        throw new Error("messageIds must contain at least one message id");
      }
      if (!["archive", "delete", "restore"].includes(normalizedAction)) {
        res.status(400);
        throw new Error("Invalid bulk action. Allowed values: archive, delete, restore");
      }

      const gmail = await getGmailClientForUserEmail(authorizedEmail);

      // Execute one-by-one to avoid entire batch failure on a single invalid id.
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (normalizedAction === "archive") {
            return gmail.users.messages.modify({
              userId: "me",
              id,
              requestBody: { removeLabelIds: ["INBOX"] },
            });
          }
          if (normalizedAction === "delete") {
            // Move to trash (recoverable), not permanent delete
            return gmail.users.messages.trash({
              userId: "me",
              id,
            });
          }
          if (normalizedAction === "restore") {
            // Untrash and restore to inbox
            return gmail.users.messages.untrash({
              userId: "me",
              id,
            });
          }
        })
      );

      const failedIds = results
        .map((result, index) => (result.status === "rejected" ? ids[index] : null))
        .filter(Boolean);
      const succeededIds = ids.filter((id) => !failedIds.includes(id));

      // If every single call to Gmail failed, surface the first error clearly
      if (succeededIds.length === 0) {
        const firstFailure = results.find((r) => r.status === "rejected");
        const gmailErr = firstFailure?.reason;
        const statusCode = gmailErr?.code || gmailErr?.status || 500;
        const message =
          statusCode === 403 || statusCode === 401
            ? "Gmail permission denied. Please log out and log back in to grant the required permissions."
            : `Gmail action failed: ${gmailErr?.message || "Unknown error"}`;
        res.status(statusCode >= 400 ? statusCode : 500);
        throw new Error(message);
      }

      if (normalizedAction === "delete") {
        // Update local DB: remove INBOX label first, then add TRASH
        // NOTE: MongoDB does not allow $addToSet and $pull on the same field
        // in a single update, so we do two sequential operations.
        await Email.updateMany(
          { userEmail: authorizedEmail, messageId: { $in: succeededIds } },
          { $pull: { labelIds: "INBOX" } }
        );
        await Email.updateMany(
          { userEmail: authorizedEmail, messageId: { $in: succeededIds } },
          { $addToSet: { labelIds: "TRASH" } }
        );
      }

      if (normalizedAction === "archive") {
        await Email.updateMany(
          { userEmail: authorizedEmail, messageId: { $in: succeededIds } },
          { $pull: { labelIds: "INBOX" } }
        );
      }

      if (normalizedAction === "restore") {
        // Restore: remove TRASH label first, then add INBOX back
        await Email.updateMany(
          { userEmail: authorizedEmail, messageId: { $in: succeededIds } },
          { $pull: { labelIds: "TRASH" } }
        );
        await Email.updateMany(
          { userEmail: authorizedEmail, messageId: { $in: succeededIds } },
          { $addToSet: { labelIds: "INBOX" } }
        );
      }

      res.json({
        message: `Bulk ${normalizedAction} completed`,
        requested: ids.length,
        succeeded: succeededIds.length,
        failed: failedIds.length,
        failedIds,
      });
    } catch (error) {
      console.error(`[Bulk Action] Error (${action}):`, error.message, error.stack);
      next(error);
    }
  });

module.exports = router;
