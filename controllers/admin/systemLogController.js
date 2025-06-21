const SystemLog = require("../../models/SystemLogs");

exports.getLogs = async (req, res) => {
  try {
    const { level, limit = 50, skip = 0 } = req.query;

    const query = level ? { level } : {};

    const logs = await SystemLog.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching logs", error: error.message });
  }
};
