import express from "express";
import pool from "../db/db.js";

const router = express.Router();

// Simple helpers for validation and errors
class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (errors) this.errors = errors; // field-level errors
  }
}

const parseIntSafe = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
};
const parseFloatSafe = (value) => {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? undefined : n;
};

// GET /products (list with filtering, sorting, pagination)
router.get("/", async (req, res, next) => {
  try {
    const errors = {};

    const page = parseIntSafe(req.query.page) ?? 1;
    const perPage = parseIntSafe(req.query.per_page) ?? 10;
    if (page < 1) errors.page = "must be >= 1";
    if (perPage < 1 || perPage > 100) errors.per_page = "must be between 1 and 100";

    const name = req.query.name?.toString().trim();
    const minPrice = req.query.min_price !== undefined ? parseFloatSafe(req.query.min_price) : undefined;
    const maxPrice = req.query.max_price !== undefined ? parseFloatSafe(req.query.max_price) : undefined;

    if (minPrice !== undefined && (Number.isNaN(minPrice) || minPrice < 0)) errors.min_price = "must be a non-negative number";
    if (maxPrice !== undefined && (Number.isNaN(maxPrice) || maxPrice < 0)) errors.max_price = "must be a non-negative number";
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) errors.price = "min_price cannot be greater than max_price";

    const allowedSort = new Set(["id", "name", "price"]);
    const sortBy = req.query.sort_by?.toString() ?? "id";
    const sortDir = (req.query.sort_dir?.toString().toLowerCase() ?? "asc") === "desc" ? "DESC" : "ASC";
    if (!allowedSort.has(sortBy)) errors.sort_by = `must be one of: ${[...allowedSort].join(", ")}`;

    if (Object.keys(errors).length) {
      throw new HttpError(422, "Validation failed", errors);
    }

    // Build WHERE clause and params
    const where = [];
    const params = [];
    if (name) {
      params.push(`%${name}%`);
      where.push(`name ILIKE $${params.length}`);
    }
    if (minPrice !== undefined) {
      params.push(minPrice);
      where.push(`price >= $${params.length}`);
    }
    if (maxPrice !== undefined) {
      params.push(maxPrice);
      where.push(`price <= $${params.length}`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Total count for pagination
    const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM products ${whereSQL};`, params);
    const total = Number(countResult.rows[0]?.count || 0);

    // Fetch page
    const offset = (page - 1) * perPage;
    // Validate sort column safely (whitelist already checked)
    const sortColumn = ["id", "name", "price"].includes(sortBy) ? sortBy : "id";
    const dataParams = params.slice();
    dataParams.push(perPage, offset);
    const result = await pool.query(
      `SELECT * FROM products ${whereSQL} ORDER BY ${sortColumn} ${sortDir} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};`,
      dataParams
    );

    res.json({
      data: result.rows,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
        sort_by: sortColumn,
        sort_dir: sortDir === "DESC" ? "desc" : "asc",
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id (get by id)
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseIntSafe(req.params.id);
    if (!id || id < 1) {
      throw new HttpError(422, "Validation failed", { id: "must be a positive integer" });
    }

    const result = await pool.query("SELECT * FROM products WHERE id = $1;", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not Found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /products (create)
router.post("/", async (req, res, next) => {
  try {
    const { name, price } = req.body ?? {};
    const errors = {};
    if (typeof name !== "string" || name.trim().length === 0) errors.name = "is required and must be a non-empty string";
    if (name && name.length > 255) errors.name = "must be at most 255 characters";
    if (typeof price !== "number" || Number.isNaN(price) || price < 0) errors.price = "is required and must be a non-negative number";

    if (Object.keys(errors).length) throw new HttpError(422, "Validation failed", errors);

    const result = await pool.query(
      "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *;",
      [name.trim(), price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id (partial update)
router.patch("/:id", async (req, res, next) => {
  try {
    const id = parseIntSafe(req.params.id);
    if (!id || id < 1) throw new HttpError(422, "Validation failed", { id: "must be a positive integer" });

    const { name, price } = req.body ?? {};
    const errors = {};
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) errors.name = "must be a non-empty string";
    if (name && name.length > 255) errors.name = "must be at most 255 characters";
    if (price !== undefined && (typeof price !== "number" || Number.isNaN(price) || price < 0)) errors.price = "must be a non-negative number";
    if (name === undefined && price === undefined) errors.body = "at least one of 'name' or 'price' is required";

    if (Object.keys(errors).length) throw new HttpError(422, "Validation failed", errors);

    const result = await pool.query(
      "UPDATE products SET name = COALESCE($1, name), price = COALESCE($2, price) WHERE id = $3 RETURNING *;",
      [name !== undefined ? name.trim() : null, price !== undefined ? price : null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not Found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /products/:id (delete, 204 No Content)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseIntSafe(req.params.id);
    if (!id || id < 1) throw new HttpError(422, "Validation failed", { id: "must be a positive integer" });

    const result = await pool.query("DELETE FROM products WHERE id = $1;", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Not Found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
