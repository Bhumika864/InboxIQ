const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GROQ_API_KEY",
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

module.exports = {
  validateEnv,
};
