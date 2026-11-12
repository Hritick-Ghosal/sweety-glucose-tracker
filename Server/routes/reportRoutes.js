const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getReports } = require("../controllers/reportController");

// Protect report routes
router.use(protect);

// GET /api/reports?date=YYYY-MM-DD
router.get("/", getReports);

module.exports = router;