import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/db.js";
import productRoutes from "./routes/products.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

app.use("/products", productRoutes);
// Connect to database on server start
if (process.env.NODE_ENV !== "test") {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server failed to start: ${error}`);
    process.exit(1);
  }
}

app.use(cookieParser());

app.get("/set-cookie", (req, res) => {
  res.cookie("theme", "dark");
});

app.get("/read-cookie", (req, res) => {
  res.send(`Theme: ${req.cookies.theme}`);
});

export default app;
