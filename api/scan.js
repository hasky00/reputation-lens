const { scanHandle } = require("../lib/reputation");

module.exports = async function handler(req, res) {
  const handle = req.query.handle || "";

  try {
    const profile = await scanHandle(handle, process.env.X_BEARER_TOKEN);
    res.status(200).json({ profile });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "X API scan failed",
      xStatus: error.status,
      xPayload: error.payload || null,
    });
  }
};
