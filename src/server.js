import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/db.js";
import productRoutes from "./routes/products.js";
import cookieParser from "cookie-parser";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// OpenAPI config
const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Products API",
      version: "1.0.0",
      description:
        "CRUD API for managing products with pagination and filtering",
    },
    servers: [{ url: "http://localhost:4000/api/products" }],
  },
  apis: ["./routes/*.js"], // Path to your route files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Global middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Demo cookie endpoints
app.get("/set-cookie", (req, res) => {
  res.cookie("theme", "dark");
  res.status(204).send();
});

app.get("/read-cookie", (req, res) => {
  res.send(`Theme: ${req.cookies.theme}`);
});

// Routes
app.use("/products", productRoutes);

// 404 for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handling middleware
// Converts thrown/rejected errors into JSON consistently
// Accepts optional shape: { status|statusCode, message, errors }
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.name || "Error",
    message:
      err.message || (status === 500 ? "Internal Server Error" : undefined),
  };
  if (err.errors && typeof err.errors === "object") {
    payload.errors = err.errors;
  }
  if (status >= 500) {
    // Ensure visibility of unexpected errors without crashing process
    console.error("Unhandled error:", err);
  }
  res.status(status).json(payload);
});

// Global process-level guards so unhandled errors don't crash the process
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Connect to database on server start (skipped in tests)
if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error(`Server failed to start: ${error}`);
      // Do not crash, but expose visibility
    }
  })();
}

export default app;
