import express from "express";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Initialize SQLite database
const db = new sqlite3.Database("./data.sqlite", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      storage_choice TEXT,
      dropoff_time TEXT,
      qr TEXT,
      status TEXT,
      location TEXT
    )`);
  }
});

// Home page - submission form
app.get("/", (req, res) => {
  res.render("index");
});

// Handle form submission
app.post("/submit", async (req, res) => {
  const { name, description, storage_choice, dropoff_time } = req.body;
  const id = Date.now(); // unique ID for QR
  const qrData = `ID:${id}|Name:${name}`;
  const qrImage = await QRCode.toDataURL(qrData);

  const sql = `INSERT INTO items (name, description, storage_choice, dropoff_time, qr, status)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [name, description, storage_choice, dropoff_time, qrImage, "Submitted"], function(err) {
    if (err) {
      console.error(err.message);
      res.send("Error saving item.");
    } else {
      res.render("tracking", { item: { id, name, qr: qrImage, status: "Submitted" } });
    }
  });
});

// Admin dashboard
app.get("/dashboard", (req, res) => {
  const sql = "SELECT * FROM items ORDER BY id DESC";
  db.all(sql, [], (err, items) => {
    if (err) {
      console.error(err.message);
      res.send("Error loading dashboard.");
    } else {
      res.render("dashboard", { items });
    }
  });
});

// Scan QR / update item
app.post("/update/:id", (req, res) => {
  const { status, location } = req.body;
  const sql = "UPDATE items SET status = ?, location = ? WHERE id = ?";
  db.run(sql, [status, location, req.params.id], function(err) {
    if (err) {
      console.error(err.message);
      res.send("Error updating item.");
    } else {
      res.redirect("/dashboard");
    }
  });
});

// Tracking page by QR code ID
app.get("/track/:id", (req, res) => {
  const sql = "SELECT * FROM items WHERE id = ?";
  db.get(sql, [req.params.id], (err, item) => {
    if (err || !item) {
      res.send("Item not found.");
    } else {
      res.render("tracking", { item });
    }
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
