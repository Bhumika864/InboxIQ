process.env.NODE_ENV = "test";
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "test-groq-key";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
process.env.GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/auth/google/callback";

const request = require("supertest");
const { createApp } = require("../app");

describe("Backend hardening smoke tests", () => {
  const app = createApp();

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("GET /email/list/:email requires auth token", async () => {
    const response = await request(app).get("/email/list/test@example.com");
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Not authorized/i);
  });
});
