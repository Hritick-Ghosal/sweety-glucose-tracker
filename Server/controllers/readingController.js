const { pool } = require("../config/db");

const VALID_SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner",
];

// Helper: Get today's date in YYYY-MM-DD (local server date)
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: Validate reading input
const validateReadingInput = ({ reading_date, time_slot, glucose_value }) => {
  // 1. Date validation
  if (!reading_date || !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)) {
    return "Please select a valid date (YYYY-MM-DD).";
  }

  if (reading_date > getTodayString()) {
    return "Date cannot be in the future.";
  }

  // 2. Slot validation
  if (!time_slot || !VALID_SLOTS.includes(time_slot)) {
    return "Please select a valid time slot.";
  }

  // 3. Glucose value required check
  if (
    glucose_value === undefined ||
    glucose_value === null ||
    String(glucose_value).trim() === ""
  ) {
    return "Please enter a glucose value.";
  }

  // 4. Whole number between 40 and 600 check
  const numericValue = Number(glucose_value);
  if (
    !Number.isInteger(numericValue) ||
    numericValue < 40 ||
    numericValue > 600
  ) {
    return "Value must be between 40 and 600 mg/dl.";
  }

  return null;
};

// GET ALL READINGS FOR LOGGED-IN USER (supports ?date=YYYY-MM-DD and ?page=1&limit=20)
const getReadings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let whereClause = `WHERE user_id = $1`;
    const params = [userId];

    if (date) {
      params.push(date);
      whereClause += ` AND reading_date = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM readings ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataParams = [...params, limit, offset];
    const query = `
      SELECT id, user_id, TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
             time_slot, glucose_value, created_at
      FROM readings
      ${whereClause}
      ORDER BY reading_date DESC,
      CASE time_slot
        WHEN 'Morning' THEN 1
        WHEN 'After breakfast' THEN 2
        WHEN 'After lunch' THEN 3
        WHEN 'After dinner' THEN 4
      END ASC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const result = await pool.query(query, dataParams);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      readings: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get readings error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ADD A NEW READING
const createReading = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reading_date, time_slot, glucose_value } = req.body;

    const validationError = validateReadingInput({
      reading_date,
      time_slot,
      glucose_value,
    });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Check existing readings for this user on this date
    const existingForDay = await pool.query(
      `SELECT id, time_slot FROM readings
       WHERE user_id = $1 AND reading_date = $2`,
      [userId, reading_date]
    );

    if (existingForDay.rows.length >= 4) {
      return res.status(400).json({
        success: false,
        message: "You can add only 4 readings per day.",
      });
    }

    const duplicateSlot = existingForDay.rows.find(
      (r) => r.time_slot === time_slot
    );
    if (duplicateSlot) {
      return res.status(409).json({
        success: false,
        message: `You already have an ${time_slot} reading for this date.`,
      });
    }

    const result = await pool.query(
      `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                 time_slot, glucose_value, created_at`,
      [userId, reading_date, time_slot, Number(glucose_value)]
    );

    return res.status(201).json({
      success: true,
      message: "Reading added successfully!",
      reading: result.rows[0],
    });
  } catch (error) {
    console.error("Create reading error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// UPDATE AN EXISTING READING
const updateReading = async (req, res) => {
  try {
    const userId = req.user.id;
    const readingId = req.params.id;
    const { reading_date, time_slot, glucose_value } = req.body;

    // Verify reading exists and belongs to the logged-in user
    const existing = await pool.query(
      `SELECT id FROM readings WHERE id = $1 AND user_id = $2`,
      [readingId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reading not found.",
      });
    }

    const validationError = validateReadingInput({
      reading_date,
      time_slot,
      glucose_value,
    });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Check other readings on the target date (excluding current reading)
    const otherReadingsForDay = await pool.query(
      `SELECT id, time_slot FROM readings
       WHERE user_id = $1 AND reading_date = $2 AND id <> $3`,
      [userId, reading_date, readingId]
    );

    if (otherReadingsForDay.rows.length >= 4) {
      return res.status(400).json({
        success: false,
        message: "You can add only 4 readings per day.",
      });
    }

    const duplicateSlot = otherReadingsForDay.rows.find(
      (r) => r.time_slot === time_slot
    );
    if (duplicateSlot) {
      return res.status(409).json({
        success: false,
        message: `You already have an ${time_slot} reading for this date.`,
      });
    }

    const result = await pool.query(
      `UPDATE readings
       SET reading_date = $1, time_slot = $2, glucose_value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                 time_slot, glucose_value, created_at`,
      [reading_date, time_slot, Number(glucose_value), readingId, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Reading updated successfully!",
      reading: result.rows[0],
    });
  } catch (error) {
    console.error("Update reading error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// DELETE A READING
const deleteReading = async (req, res) => {
  try {
    const userId = req.user.id;
    const readingId = req.params.id;

    const result = await pool.query(
      `DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id`,
      [readingId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reading not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reading deleted successfully!",
    });
  } catch (error) {
    console.error("Delete reading error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  getReadings,
  createReading,
  updateReading,
  deleteReading,
};