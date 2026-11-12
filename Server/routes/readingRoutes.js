const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getReadings,
  createReading,
  updateReading,
  deleteReading,
} = require("../controllers/readingController");

// Protect all reading routes with JWT authentication
router.use(protect);

router.get("/", getReadings);
router.post("/", createReading);
router.put("/:id", updateReading);
router.delete("/:id", deleteReading);

module.exports = router;