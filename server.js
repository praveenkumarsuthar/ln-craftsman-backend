const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const app = express();
const PORT = 5000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ---------- POSTGRES CONNECTION ----------
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
});

// test connection
pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// ---------- MULTER ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    return res.json({ success: true });
  }

  res.json({ success: false });
});

// ================= PROJECTS =================

// ADD PROJECT
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const image = req.file.filename;

    const result = await pool.query(
      "INSERT INTO projects (title, description, image) VALUES ($1,$2,$3) RETURNING *",
      [title, description, image]
    );

    res.json({ message: "Project uploaded", project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET PROJECTS
app.get("/projects", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM projects ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE PROJECT
app.delete("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const project = await pool.query("SELECT * FROM projects WHERE id=$1", [id]);

    if (project.rows.length === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    const img = project.rows[0].image;

    await pool.query("DELETE FROM projects WHERE id=$1", [id]);

    const filePath = path.join(__dirname, "uploads", img);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CONTACT =================

// INSERT CONTACT
app.post("/contact", async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    const result = await pool.query(
      "INSERT INTO contacts (name, phone, message, created_at) VALUES ($1,$2,$3,NOW()) RETURNING *",
      [name, phone, message]
    );

    res.json({ message: "Saved", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET CONTACTS
app.get("/contacts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM contacts ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
