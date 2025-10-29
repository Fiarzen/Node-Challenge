import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL!");
    client.release();
  } catch (err) {
    console.error(" Database connection error:", err);
    throw err;
  }
}

export default pool;
