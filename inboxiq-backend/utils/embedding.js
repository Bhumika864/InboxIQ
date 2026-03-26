let extractor = null;

async function getExtractor() {
  if (!extractor) {
    console.log("Initializing embedding model (this may take a few seconds)...");
    const { pipeline } = await import("@xenova/transformers");
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Embedding model ready.");
  }
  return extractor;
}

async function embed(text) {
  try {
    const model = await getExtractor();
    const output = await model(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data);
  } catch (err) {
    console.error("Embedding failed:", err);
    throw err;
  }
}

module.exports = { embed };