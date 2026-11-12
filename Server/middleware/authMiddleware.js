const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Token missing.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Invalid token payload.",
      });
    }

    req.user = { id: userId, email: decoded.email };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

module.exports = { protect };