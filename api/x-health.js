const { getUsage, tokenFingerprint } = require("../lib/reputation");

module.exports = async function handler(req, res) {
  try {
    const usage = await getUsage(process.env.X_BEARER_TOKEN);
    res.status(200).json({
      ok: true,
      token: tokenFingerprint(process.env.X_BEARER_TOKEN),
      usage,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      ok: false,
      token: tokenFingerprint(process.env.X_BEARER_TOKEN),
      error: error.message || "X API health check failed",
      xPayload: error.payload || null,
    });
  }
};
