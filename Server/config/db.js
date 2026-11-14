const { Pool } = require("pg");
require("dotenv").config();

const isLocal =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("localhost") ||
  process.env.DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
});

pool.on("connect", () => {
  console.log("PostgreSQL client connected");
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

const connectDB = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL Connected Successfully");
    console.log("Database Time:", result.rows[0].now);
  } catch (error) {
    console.error("Database Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };