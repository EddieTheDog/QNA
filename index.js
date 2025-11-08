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
  if (err) console.error("DB error:", err.message);
  else {
    console.log("Connected to SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      storage_choice TEXT,
      dropoff_time TEXT,
      qr TEXT,
      status TEXT,
      location TEXT,
      instructions TEXT,
      note TEXT
    )`);
  }
});

// Home page - submission form
app.get("/", (req, res) => {
  res.render("index");
});

// Handle form submission
app.post("/submit", async (req, res) => {
  const { name, description, storage_choice, dropoff_time, instructions } = req.body;
  const id = Date.now(); // unique ID
  const qrData = `ID:${id}`;
  const qrImage = await QRCode.toDataURL(qrData);

  db.run(`INSERT INTO items (name, description, storage_choice, dropoff_time, qr, status, instructions) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, storage_choice, dropoff_time, qrImage, "Submitted", instructions],
    function(err) {
      if (err) res.send("Error saving item.");
      else res.render("tracking", { item: { id, name, qr: qrImage, status: "Submitted", instructions, dropoff_time } });
    });
});

// Front desk lookup by ID
app.get("/frontdesk", (req, res) => {
  res.render("frontdesk", { item: null });
});

// Pull item info by ID
app.post("/frontdesk", (req, res) => {
  const { id } = req.body;
  db.get("SELECT * FROM items WHERE id = ?", [id], (err, item) => {
    if (err || !item) res.render("frontdesk", { item: null, error: "Item not found" });
    else res.render("frontdesk", { item });
  });
});

// Update item from front desk
app.post("/frontdesk/update/:id", (req, res) => {
  const { status, location, note } = req.body;
  db.run("UPDATE items SET status = ?, location = ?, note = ? WHERE id = ?",
    [status, location, note, req.params.id],
    function(err) {
      if (err) res.send("Error updating item");
      else res.redirect("/frontdesk");
    });
});

// Admin dashboard
app.get("/dashboard", (req, res) => {
  db.all("SELECT * FROM items ORDER BY id DESC", [], (err, items) => {
    if (err) res.send("Error loading dashboard");
    else res.render("dashboard", { items });
  });
});

// Tracking page
app.get("/track/:id", (req, res) => {
  db.get("SELECT * FROM items WHERE id = ?", [req.params.id], (err, item) => {
    if (err || !item) res.send("Item not found");
    else res.render("tracking", { item });
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
