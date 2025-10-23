import express from "express";

const app = express();

app.get("/", (req, res) => {
  console.log("GET / hit");
  res.send("Test OK");
});

app.listen(4000, () => {
  console.log("Test server running on http://localhost:4000");
});
