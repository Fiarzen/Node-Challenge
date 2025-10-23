import express from "express";
import pool from "../db/db.js";

const router = express.Router();

// GET /products (list all)
router.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM products;");
  res.json(result.rows);
});

// GET /products/:id (get by id)
router.get("/:id", async (req, res) => {
  const result = await pool.query("SELECT * FROM products WHERE id = $1;", [
    req.params.id,
  ]);
  if (result.rows.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

// POST /products (create)
router.post("/", async (req, res) => {
  const { name, price } = req.body;
  const result = await pool.query(
    "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *;",
    [name, price]
  );
  res.status(201).json(result.rows[0]); // requirement: 201 on create
});

// PATCH /products/:id (partial update)
router.patch("/:id", async (req, res) => {
  const { name, price } = req.body;
  const result = await pool.query(
    "UPDATE products SET name = COALESCE($1, name), price = COALESCE($2, price) WHERE id = $3 RETURNING *;",
    [name, price, req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE /products/:id (delete, 204 No Content)
router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM products WHERE id = $1;", [req.params.id]);
  res.status(204).send(); // requirement: 204 on delete
});

export default router;
