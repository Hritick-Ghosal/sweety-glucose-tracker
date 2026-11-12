const bcrypt = require("bcryptjs");
require("dotenv").config();
const { pool } = require("../config/db");

const seedDatabase = async () => {
  try {
    console.log("Seeding Sweety database...");

    const email = "demo@sweety.com";
    const hashedPassword = await bcrypt.hash("Sweety123", 12);

    // Upsert demo user
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password
       RETURNING id, name, email`,
      ["Demo Patient", email, hashedPassword]
    );

    const user = userResult.rows[0];

    // Remove existing readings for demo user so script is idempotent
    await pool.query("DELETE FROM readings WHERE user_id = $1", [user.id]);

    // Build dynamic dates for current month and previous month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const today = now.getDate();

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const fmt = (y, m, d) =>
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const sampleReadings = [
      // Previous month sample readings (for Monthly report)
      { date: fmt(prevYear, prevMonth, 5), slot: "Morning", value: 94 },
      { date: fmt(prevYear, prevMonth, 5), slot: "After breakfast", value: 138 },
      { date: fmt(prevYear, prevMonth, 5), slot: "After lunch", value: 146 },
      { date: fmt(prevYear, prevMonth, 5), slot: "After dinner", value: 132 },
      { date: fmt(prevYear, prevMonth, 15), slot: "Morning", value: 101 },
      { date: fmt(prevYear, prevMonth, 15), slot: "After lunch", value: 155 },
      { date: fmt(prevYear, prevMonth, 24), slot: "Morning", value: 89 },
      { date: fmt(prevYear, prevMonth, 24), slot: "After dinner", value: 129 },

      // Current month earlier days (for Month-to-Date report)
      { date: fmt(year, month, 1), slot: "Morning", value: 96 },
      { date: fmt(year, month, 1), slot: "After breakfast", value: 141 },
      { date: fmt(year, month, 1), slot: "After lunch", value: 149 },
      { date: fmt(year, month, 1), slot: "After dinner", value: 128 },

      // Today's readings (for Daily + Month-to-Date report)
      { date: fmt(year, month, today), slot: "Morning", value: 98 },
      { date: fmt(year, month, today), slot: "After breakfast", value: 142 },
      { date: fmt(year, month, today), slot: "After lunch", value: 151 },
    ];

    for (const r of sampleReadings) {
      await pool.query(
        `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
         VALUES ($1, $2, $3, $4)`,
        [user.id, r.date, r.slot, r.value]
      );
    }

    console.log(`Seeded user: ${user.email} (Password: Sweety123)`);
    console.log(`Inserted ${sampleReadings.length} sample readings.`);
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
};

seedDatabase();