const { pool } = require("../config/db");

// Helper: Get today's date in YYYY-MM-DD
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: Calculate start & end dates cleanly without timezone drift
const getDateRanges = (selectedDate) => {
  const [yearStr, monthStr] = selectedDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  // Month-to-date: 1st of selected month -> selectedDate
  const mtdStart = `${yearStr}-${monthStr}-01`;
  const mtdEnd = selectedDate;

  // Previous month: 1st of previous month -> last day of previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthStr = String(prevMonth).padStart(2, "0");

  // Day 0 of current month in JS Date gives exact last day of previous month (handles leap years)
  const lastDayOfPrevMonth = new Date(year, month - 1, 0).getDate();
  const prevMonthStart = `${prevYear}-${prevMonthStr}-01`;
  const prevMonthEnd = `${prevYear}-${prevMonthStr}-${String(lastDayOfPrevMonth).padStart(2, "0")}`;

  return {
    daily: { startDate: selectedDate, endDate: selectedDate },
    monthToDate: { startDate: mtdStart, endDate: mtdEnd },
    monthly: { startDate: prevMonthStart, endDate: prevMonthEnd },
  };
};

// Helper: Query aggregate stats for a date range
const getStatsForRange = async (userId, startDate, endDate) => {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS count,
       MAX(glucose_value)::int AS highest,
       MIN(glucose_value)::int AS lowest,
       ROUND(AVG(glucose_value)::numeric, 1)::float AS average
     FROM readings
     WHERE user_id = $1
       AND reading_date >= $2
       AND reading_date <= $3`,
    [userId, startDate, endDate]
  );

  const row = result.rows[0];
  return {
    startDate,
    endDate,
    count: row.count || 0,
    highest: row.highest !== null ? row.highest : null,
    lowest: row.lowest !== null ? row.lowest : null,
    average: row.average !== null ? Number(row.average.toFixed(1)) : null,
  };
};

// GET /api/reports?date=YYYY-MM-DD
const getReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const selectedDate = req.query.date || getTodayString();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date in YYYY-MM-DD format.",
      });
    }

    const ranges = getDateRanges(selectedDate);

    // Run stats queries and daily readings list in parallel
    const [dailyStats, mtdStats, monthlyStats, dailyReadingsResult] =
      await Promise.all([
        getStatsForRange(
          userId,
          ranges.daily.startDate,
          ranges.daily.endDate
        ),
        getStatsForRange(
          userId,
          ranges.monthToDate.startDate,
          ranges.monthToDate.endDate
        ),
        getStatsForRange(
          userId,
          ranges.monthly.startDate,
          ranges.monthly.endDate
        ),
        pool.query(
          `SELECT id, TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                  time_slot, glucose_value
           FROM readings
           WHERE user_id = $1 AND reading_date = $2
           ORDER BY CASE time_slot
             WHEN 'Morning' THEN 1
             WHEN 'After breakfast' THEN 2
             WHEN 'After lunch' THEN 3
             WHEN 'After dinner' THEN 4
           END ASC`,
          [userId, selectedDate]
        ),
      ]);

    return res.status(200).json({
      success: true,
      selectedDate,
      reports: {
        daily: {
          ...dailyStats,
          readings: dailyReadingsResult.rows,
        },
        monthToDate: mtdStats,
        monthly: monthlyStats,
      },
    });
  } catch (error) {
    console.error("Get reports error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = { getReports };