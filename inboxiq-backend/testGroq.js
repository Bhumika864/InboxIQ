require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function run() {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "user", content: "Say hello" }
      ],
    });

    console.log("SUCCESS:");
    console.log(response.choices[0].message.content);

  } catch (err) {
    console.error("GROQ ERROR:");
    console.error(err);
  }
}

run();