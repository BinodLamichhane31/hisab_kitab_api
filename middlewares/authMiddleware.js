const jwt = require("jsonwebtoken");

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
