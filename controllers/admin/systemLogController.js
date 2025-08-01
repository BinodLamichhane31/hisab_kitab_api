const SystemLog = require("../../models/SystemLogs");

exports.getLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 15, 
      level, 
      search = "" 
    } = req.query;

    const pageSize = parseInt(limit);
    const skip = (parseInt(page) - 1) * pageSize;

    const query = {};
    if (level) {
      query.level = level; 
    }
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }

    const [logs, totalLogs] = await Promise.all([
        SystemLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(pageSize),
        SystemLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: "Logs fetched successfully",
      data: logs,
      pagination: {
        totalRecords: totalLogs,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / pageSize),
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};