import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/db.js";
import productRoutes from "./routes/products.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Connect to database on server start
try {
  await connectDB();
  app.get("/", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
  });

  app.use("/products", productRoutes);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.log(`Server failed to start: ${error}`);
  process.exit(1);
}
